import time
import urllib.parse
import requests
from fastapi import FastAPI, Request, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://mhc-datathon.github.io",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-Memory Cache
cache = {}
CACHE_DURATION_SECONDS = 3600  # 1 hour

# API Data Fetch
SOCRATA_API_ENDPOINT = "https://data.ny.gov/resource/kh8p-hcbm.json"

def fetch_violations_for_year(year: int):
    """
    Fetches records for a specific year from the Socrata API, using a SoQL $where
    clause to filter by both year and exempt statuses on the server side.
    """
    all_records = []
    limit = 50000
    offset = 0

    excluded_statuses_list = [
        "EXEMPT - OTHER",
        "EXEMPT - EMERGENCY VEHICLE",
        "EXEMPT - BUS/PARATRANSIT",
        "EXEMPT - COMMERCIAL VEHICLE"
    ]

    formatted_statuses = ', '.join([f"'{status}'" for status in excluded_statuses_list])
    soql_where_clause = f"violation_status NOT IN ({formatted_statuses}) AND date_extract_y(last_occurrence) = {year}"

    encoded_where_clause = urllib.parse.quote(soql_where_clause)

    print(f"Starting to fetch data for year {year} from Socrata API...")
    print(f"SoQL Filter: {soql_where_clause}")

    while True:
        paginated_url = f"{SOCRATA_API_ENDPOINT}?$where={encoded_where_clause}&$limit={limit}&$offset={offset}"
        
        response = requests.get(paginated_url)

        if response.status_code != 200:
            print(f"Failed to fetch data: Status code {response.status_code}")
            print(f"Response: {response.text}")
            raise HTTPException(status_code=response.status_code, detail=f"Socrata API error: {response.text}")

        data = response.json()

        if not data:
            print(f"Finished fetching all data for year {year}.")
            break

        all_records.extend(data)

        offset += limit
        print(f"Fetched {len(data)} records for {year}. Total so far: {len(all_records)}")

    return all_records

# API Endpoint
@app.get("/api/violations")
def get_violations(
    request: Request,
    year: int = Query(..., ge=2019, le=2025, description="The year to filter violations by"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50000, ge=1, le=50000, description="Items per page.")
):
    """
    Serves violation data, filtered by year on the server side, with per-year caching.
    :return: JSON response containing the filtered violation data
    """
    current_time = time.time()
    year_str = str(year)

    if year_str in cache and (current_time - cache[year_str]["last_fetched"]) <= CACHE_DURATION_SECONDS:
        print(f"Serving data for year {year_str} from cache.")
        data_to_filter = cache[year_str]["data"]
    else:
        print(f"Cache miss or expired for year {year_str}. Fetching new data.")
        try:
            fresh_data = fetch_violations_for_year(year)
            cache[year_str] = {
                "data": fresh_data,
                "last_fetched": current_time
            }
            data_to_filter = fresh_data
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
        
    query_params = dict(request.query_params)
    query_params.pop("year", None)    

    query_params.pop("page", None)
    query_params.pop("page_size", None)
    filtered_data = data_to_filter

    if query_params:
        print(f"Applying other dynamic filters: {query_params}")
        filtered_data = [
            record for record in data_to_filter
            if all(str(record.get(key, '')).lower() == str(value).lower() for key, value in query_params.items())
        ]
    
    total_items = len(filtered_data)
    start_index = (page - 1) * page_size
    end_index = start_index + page_size

    paginated_data = filtered_data[start_index:end_index]
    return {
        "data": paginated_data,
        "count": len(paginated_data),
        "total_items": total_items,
        "page": page,
        "page_size": page_size,
        "total_pages": (total_items + page_size - 1) // page_size,
        "status": "cached"
    }
    
@app.get("/")
def read_root():
    return {"message": "Welcome to the MTA Datathon API Backend!"}
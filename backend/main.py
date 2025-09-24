import time
import urllib.parse
import requests
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

origins = [
    "http://localhost:5173",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-Memory Cache
cache = {
    "data": None,
    "last_fetched": 0
}
CACHE_DURATION_SECONDS = 3600

# API Data Fetch
SOCRATA_API_ENDPOINT = "https://data.ny.gov/resource/kh8p-hcbm.json"

def fetch_all_violation_data():
    """
    Fetches all records from the Socrata API, handling pagination and applying the permanent filters to exclude exempt statuses.
    :return: returns the fetched MTA Bus ACE Violations dataset
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
    soql_where_clause = f"violation_status NOT IN ({formatted_statuses})"

    encoded_where_clause = urllib.parse.quote(soql_where_clause)

    print("Starting to fetch data from Socrata API...")
    print(f"SoQL Filter: {soql_where_clause}")

    while True:
        paginated_url = f"{SOCRATA_API_ENDPOINT}?$where={encoded_where_clause}&$limit={limit}&$offset={offset}"
        
        response = requests.get(paginated_url)

        if response.status_code != 200:
            print(f"Failed to fetch data: Status code {response.status_code}")

            break

        data = response.json()

        if not data:
            print("Finished fetching all data.")
            break

        all_records.extend(data)

        offset += limit
        print(f"Fetched {len(data)} records. Total so far: {len(all_records)}")

    return all_records

# API Endpoint
@app.get("/api/violations")
def get_violations(request: Request):
    """
    The API endpoint that your React app will call.
    It serves pre-filtered data from cache and applies additional
    dynamic filters from query parameters.
    :return: JSON response containing the filtered violation data
    """
    current_time = time.time()

    if cache["data"] is None or (current_time - cache["last_fetched"]) > CACHE_DURATION_SECONDS:
        print("Cache is expired or empty. Fetching new data.")
        try:
            fresh_data = fetch_all_violation_data()

            cache["data"] = fresh_data
            cache["last_fetched"] = current_time
            
        except Exception as e:
            if cache["data"] is not None:
                print("API fetch failed, serving stale data from cache.")
                return {"data": cache["data"], "count": len(cache["data"]), "status": "stale"}
            raise HTTPException(status_code=500, detail=str(e))
    else:
        print("Serving data from cache.")
    
    data_to_filter = cache["data"]
    query_params = dict(request.query_params)

    if query_params:
        print(f"Applying dynamic filters: {query_params}")
        filtered_data = [
            record for record in data_to_filter
            if all(str(record.get(key, '')).lower() == str(value).lower() for key, value in query_params.items())
        ]
    else:
        filtered_data = data_to_filter

    return {"data": cache["data"], "count": len(cache["data"]), "status": "cached"}
    
@app.get("/")
def read_root():
    return {"message": "Welcome to the MTA Datathon API Backend!"}
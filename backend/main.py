import time
import requests
from fastapi import FastAPI, HTTPException
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
    Fetches all records from the Socrata API, handling pagination.
    :return: returns the fetched MTA Bus ACE Violations dataset
    """
    all_records = []
    limit = 5000
    offset = 0

    print("Starting to fetch data from Socrata API...")

    while True:
        paginated_url = f"{SOCRATA_API_ENDPOINT}?$limit={limit}&$offset={offset}"
        
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
def get_violations():
    """
    The API endpoint that your React app will call.
    It fetches the data using our function and returns it.
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

    return {"data": cache["data"], "count": len(cache["data"]), "status": "cached"}
    
@app.get("/")
def read_root():
    return {"message": "Welcome to the MTA Datathon API Backend!"}
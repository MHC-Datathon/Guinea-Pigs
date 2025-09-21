# FastAPI
## Tech Stack
FastAPI Uvicorn Requests Python

## Setup and Installation
To get the server running locally, follow these steps.

1. Prerequisites <br/> Make sure you have Python 3.7+ installed on your system.

2. Create and Activate a Virtual Environment <br/> It's highly recommended to use a virtual environment to manage project dependencies.

### Navigate to the project folder
`cd backend`

### Create a virtual environment
`python -m venv venv`

### Activate the environment
### On macOS/Linux:
`source venv/bin/activate`
### On Windows:
`.\venv\Scripts\activate`
3. Install Dependencies
Install the required Python libraries using pip.
`pip install -r requirements.txt`
## How to Run
With your virtual environment activated and dependencies installed, start the server with the following command:
`uvicorn main:app --reload`

The server will be running at http://127.0.0.1:8000.

## API Endpoints
### GET /

A root endpoint to check if the server is running.

Returns: {"message": "Welcome to the MTA Datathon API Backend!"}

### GET /api/violations

Fetches the entire MTA ACE Violations dataset.

The first request may be slow as it fetches and caches the data. Subsequent requests will be nearly instant.

Returns: A JSON object containing the dataset. {"data": [...], "count": ...}

### GET /docs

Access the automatic, interactive API documentation (Swagger UI) provided by FastAPI. This is a great tool for exploring and testing the endpoints directly from your browser.
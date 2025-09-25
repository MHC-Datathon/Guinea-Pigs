# FastAPI Backend for "The Parking Dilemma"

This repository contains the Python FastAPI backend for the "The Parking Dilemma" MTA Datathon project. The server's primary role is to fetch data from the NYC OpenData (Socrata) API, perform efficient pre-filtering and caching, and serve it to the frontend application.

## ✨ Core Features

* **Socrata API Integration:** Fetches data directly from the NYC OpenData portal's MTA Bus ACE Violations dataset.
* **Efficient Server-Side Filtering:** Uses SoQL queries to filter data at the source *before* it's downloaded. This includes filtering by year (`last_occurrence`) and removing several "EXEMPT" `violation_status` types, drastically reducing payload size and processing time.
* **Per-Year Caching:** Implements an in-memory caching system that stores the results for each year. The first request for a year is fetched from the API and cached; subsequent requests for the same year are served instantly from memory.

## 🛠️ Tech Stack

* **Python 3.7+**
* **FastAPI:** For building the high-performance API.
* **Gunicorn:** As the production-ready WSGI server.
* **Uvicorn:** As the lightning-fast ASGI server, used by Gunicorn.
* **Requests:** For making HTTP requests to the Socrata API.

---

## 🚀 Setup and Installation

To get the server running locally, follow these steps.

#### 1. Prerequisites

Make sure you have Python 3.7+ installed on your system.

#### 2. Create and Activate a Virtual Environment

It's highly recommended to use a virtual environment to manage project dependencies.

* **Navigate to the project folder:**
    ```bash
    cd backend
    ```
* **Create a virtual environment:**
    ```bash
    python -m venv venv
    ```
* **Activate the environment:**
    * On macOS/Linux: `source venv/bin/activate`
    * On Windows: `.\venv\Scripts\activate`

#### 3. Install Dependencies

Install the required Python libraries using pip.
```bash
pip install -r requirements.txt
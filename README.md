# The Parking Dilemma: How Meter Prices May Influence Transit Violations

### Team: Guinea Pigs 🐹

A submission for the MTA Datathon.

| Name              | Institution         |
| :---------------- | :------------------ |
| **Faizan Khan** | Brooklyn College ‘25 |
| **Oleksii Sudarin**| Brooklyn College ‘26 |
| **Pawel Cieslak** | Brooklyn College ‘27 |
| **Jessica Livchits**| Brooklyn College ‘27 |

---

## 🚀 Live Demo & Presentation

* **Live Website:** **[https://mhc-datathon.github.io/Guinea-Pigs/](https://mhc-datathon.github.io/Guinea-Pigs/)**
* **Slides:** **[https://docs.google.com/presentation/d/1_ENKo57u5pfSSIczA3ZdJy7V8z4nCcsRIJJJg7Lzddc/edit?usp=sharing](https://docs.google.com/presentation/d/1_ENKo57u5pfSSIczA3ZdJy7V8z4nCcsRIJJJg7Lzddc/edit?usp=sharing)**
* **Video Presentation:** **[https://www.youtube.com/watch?v=3SHfnZyjIbI](https://www.youtube.com/watch?v=3SHfnZyjIbI)**

---

## 📖 Project Overview

This project investigates the complex relationship between NYC parking meter prices and MTA Automated Camera Enforcement (ACE) violations for bus lanes. Our goal was to identify violation hotspots and determine if they correlate with parking meter rate zones.

Our analysis revealed that while higher meter prices in areas like Midtown Manhattan do correlate with more violations, population density appears to be an equally, if not more, important factor. We found significant violation hotspots in lower-cost zones that also have high population density, suggesting that congestion and increased activity are fundamental drivers of these incidents across all pricing zones.

To visualize our findings, we built an interactive, full-stack web application that maps tens of thousands of violation data points across New York City.



### The Research Question

> Meter pricing is determined based on Zones in NYC. Where are the hotspots of ACE violations? Do these violation hotspots correlate with areas of higher parking meter rates?

---

## ✨ Key Features

Our web application provides an interactive tool to explore the ACE violations dataset.

* **🗺️ Interactive Map:** A full-screen Google Map interface displaying violation data across the five boroughs.
* **🔵 Violation Clustering:** To handle the massive dataset, violations are dynamically clustered, with cluster sizes indicating the number of violations in that area.
* **🎨 Bus Route Legend:** The sidebar features a dynamically generated legend that assigns a unique, consistent color to each bus route, making it easy to identify different routes on the map.
* **📅 Year Slider:** A slider at the bottom of the page allows users to seamlessly filter the data and visualize violations for a single year, from 2019 to 2025.
* **⚙️ Dynamic Filtering:** An expandable sidebar allows for more granular filtering, such as by vehicle plate type.
* **📊 Data Pop-ups:** Clicking on any cluster reveals detailed information, including the number of violations, the most common bus route, and the stop location.

---

## 🛠️ Technology Stack

This project was built using a modern, full-stack architecture.

* **Frontend:**
    * **Framework:** React
    * **Build Tool:** Vite
    * **Mapping:** Google Maps API, Turf.js (for geospatial analysis)
* **Backend:**
    * **Framework:** Python & FastAPI
    * **Server:** Gunicorn & Uvicorn
    * **HTTP Client:** Requests (to fetch data from Socrata API)
* **Deployment:**
    * **Frontend:** GitHub Pages
    * **Backend:** Render

---

## 📚 Data Sources

* **MTA Bus ACE Violations:** The primary dataset containing all non-exempt bus lane violations. We accessed this via the Socrata Open Data API.
* **Parking Meters - Citywide Rate Zones:** Used to obtain the meter prices and geospatial data for each parking zone in NYC.
* **New York City Population By Neighborhood:** Used to analyze the correlation between population density and violation frequency.

---

## 🔬 Findings & Conclusion

Our analysis revealed a complex, two-factor relationship between meter pricing and ACE violations.

1.  **Meter Pricing:** In high-cost areas like Zone 1 (Midtown Manhattan), we observed the expected pattern: higher meter prices correlated with more violations. This suggests that cost can be a deterrent to legal parking, potentially increasing the likelihood of violations.

2.  **Population Density:** However, we also found significant violation hotspots in lower-cost Zone 3 areas, such as Mott Haven in the Bronx. This led us to conclude that population density is a fundamental driver of violations. Dense areas naturally experience higher volumes of traffic and interaction, leading to more incidents, citations, and infractions regardless of the parking price.

In conclusion, while meter pricing is a contributing factor, **population density and the resulting congestion are primary drivers of ACE violation hotspots** across all of New York City's pricing zones.

---

## 💻 Local Development Setup

To run this project on your local machine, follow these steps.

### Backend (Python/FastAPI)

1.  **Navigate to the backend directory:**
    ```bash
    cd path/to/backend
    ```
2.  **Create and activate a virtual environment:**
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows, use `venv\Scripts\activate`
    ```
3.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```
4.  **Run the server:**
    ```bash
    uvicorn main:app --reload
    ```
    The API will be available at `http://localhost:8000`.

### Frontend (React/Vite)

1.  **Navigate to the frontend directory:**
    ```bash
    cd frontend
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Set up environment variables:**
    * Create a file named `.env.local` in the frontend root directory.
    * Add your Google Maps API key to this file:
        ```
        VITE_GOOGLE_MAPS_API_KEY=YOUR_API_KEY_HERE
        VITE_API_BASE_URL=http://localhost:8000
        ```
4.  **Run the development server:**
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:5173` (or another port if 5173 is in use).
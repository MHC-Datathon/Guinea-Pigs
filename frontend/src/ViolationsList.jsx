import React, { useState, useEffect, useRef } from 'react';

function ViolationsList({ selectedYear, filters, setBusRoutes }) {
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [totalItems, setTotalItems] = useState(0);

  const controllerRef = useRef(null);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    const fetchData = async () => {
      if (controllerRef.current) {
        controllerRef.current.abort();
      }
    
      controllerRef.current = new AbortController();
      const signal = controllerRef.current.signal;
      console.log("1. Fetch process started.");

      setLoading(true);
      setError('');

      try {
        const filterParams = new URLSearchParams(filters).toString();
        const API_URL = `${API_BASE_URL}/api/violations?year=${selectedYear}&${filterParams}`;
        console.log("Fetching data for year:", selectedYear, "from:", API_URL);
        const response = await fetch(API_URL, { signal });
        console.log("3. Received response from server:", response);
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log("4. Parsed JSON successfully.");
        setViolations(result.data);
        setTotalItems(result.total_items);
        const uniqueRoutes = [...new Set(result.data.map(v => v.bus_route_id).filter(Boolean))].sort();
        setBusRoutes(uniqueRoutes);
        try {
          window.__GP_VIOLATIONS = result.data;
          window.dispatchEvent(new CustomEvent("gp-violations-updated", { detail: { violations: result.data } }));
        } catch (e) {
          console.warn("Could not dispatch gp-violations-updated:", e);
        }

      } catch (error) {
        if (error.name === 'AbortError') {
          console.log("Fetch aborted for year change.");
        } else {
          setError(`Failed to fetch data: ${error.message}`);
          console.error('Fetch error:', error);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    return () => {
      if (controllerRef.current) {
        controllerRef.current.abort();
      }
    };

  }, [selectedYear, filters, setBusRoutes]);

  return (
    <div>
      <h2>MTA ACE Violations for {selectedYear}</h2>
      {loading && <p>Fetching data...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {!loading && !error && <p>Found {totalItems} records.</p>}
    </div>
  );
}

export default ViolationsList;
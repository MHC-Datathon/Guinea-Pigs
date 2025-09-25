import React, { useState, useEffect, useRef } from 'react';

function ViolationsList({ selectedYear }) {
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [totalItems, setTotalItems] = useState(0);

  const controllerRef = useRef(null);

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
      setViolations([]);

      try {
        const API_URL = `http://localhost:8000/api/violations?year=${selectedYear}`;
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

  }, [selectedYear]);

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
import React, { useState, useEffect, useRef } from 'react';

function ViolationsList() {
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const controllerRef = useRef(null);

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
        const API_URL = 'http://localhost:8000/api/violations';
        console.log("2. Sending request to:", API_URL);
        const response = await fetch(API_URL, { signal });
        console.log("3. Received response from server:", response);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log("4. Parsed JSON successfully.");
        setViolations(result.data);

    } catch (error) {
        if (error.name === 'AbortError') {
            console.error("5. An error occurred:", error);
            setError('Fetch aborted!');
        } else {
            setError(`Failed to fetch data: ${error.message}`);
            console.error('Fetch error:', error);
        }
    } finally {
        setLoading(false);
    }
};

  const handleCancel = () => {
    if (controllerRef.current) {
      controllerRef.current.abort();
    }
  };

  return (
    <div>
      <h1>MTA ACE Violations</h1>
      <button onClick={fetchData} disabled={loading}>
        {loading ? 'Fetching...' : 'Fetch Data'}
      </button>
      {loading && <button onClick={handleCancel}>Cancel</button>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <p>Found {violations.length} records.</p>
    </div>
  );
}

export default ViolationsList;
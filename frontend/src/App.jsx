import { useState } from 'react';
import './App.css';
import ViolationsList from './ViolationsList';
import GoogleMapsPolygons from './GoogleMaps';
import YearSlider from './YearSlider';
import Sidebar from './Sidebar';

function App() {
  const [selectedYear, setSelectedYear] = useState(2019);
  const [busRoutes, setBusRoutes] = useState([]);
  const [filters, setFilters] = useState({});

  const handleFilterChange = (filterName, value) => {
    const newFilters = { ...filters };
    if (value) {
      newFilters[filterName] = value;
    } else {
      delete newFilters[filterName];
    }
    setFilters(newFilters);
  };

  return (
    <>
      <Sidebar busRoutes={busRoutes} filters={filters} onFilterChange={handleFilterChange} />

      <div className="main-content">
        <h1>MTA Datathon</h1>
        <div className="card">
          <ViolationsList selectedYear={selectedYear} filters={filters} setBusRoutes={setBusRoutes} />
          <GoogleMapsPolygons />
        </div>
        <YearSlider year={selectedYear} onYearChange={setSelectedYear} />
      </div>
    </>
  )
}

export default App;
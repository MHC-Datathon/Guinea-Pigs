import React, { useState } from 'react';
import './Sidebar.css';
import { getColorForBusRoute } from './utils';

function Sidebar({ busRoutes, filters, onFilterChange }) {
  const [isOpen, setIsOpen] = useState(true);
  const plateTypes = ["PAS", "COM", "OMT", "SPO", "OMS", "SRF", "TRC"];

  return (
    <div className={`sidebar ${isOpen ? '' : 'closed'}`}>
      <button onClick={() => setIsOpen(!isOpen)} className="sidebar-toggle">
        {isOpen ? '‹' : '›'}
      </button>
      <div className="sidebar-content">
        <h2>Bus Route Legend</h2>
        <ul className="legend-list">
          {busRoutes.map(routeId => (
            <li key={routeId} className="legend-item">
              <div
                className="legend-color-swatch"
                style={{ backgroundColor: getColorForBusRoute(routeId) }}
              />
              <span>{routeId}</span>
            </li>
          ))}
        </ul>

        <div className="filter-group">
          <h2>Filters</h2>
          <label htmlFor="plate-type-filter">Plate Type</label>
          <select
            id="plate-type-filter"
            value={filters.plate_type || ""}
            onChange={e => onFilterChange('plate_type', e.target.value)}
          >
            <option value="">All Plate Types</option>
            {plateTypes.map(pt => <option key={pt} value={pt}>{pt}</option>)}
          </select>
        </div>

      </div>
    </div>
  );
}

export default Sidebar;
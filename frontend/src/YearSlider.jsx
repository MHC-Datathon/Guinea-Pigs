import React from 'react';
import './YearSlider.css';

function YearSlider({ year, onYearChange }) {
  return (
    <div className="slider-container">
      <label htmlFor="year-slider" className="slider-label">
        {year}
      </label>
      <input
        type="range"
        id="year-slider"
        className="slider-input"
        min="2019"
        max="2025"
        value={year}
        onChange={(e) => onYearChange(parseInt(e.target.value, 10))}
      />
    </div>
  );
}

export default YearSlider;
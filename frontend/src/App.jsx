import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import ViolationsList from './ViolationsList'
import Intro from './GoogleMaps'
import GoogleMapsPolygons from './GoogleMaps'
import YearSlider from './YearSlider'

function App() {
  const [selectedYear, setSelectedYear] = useState(2025);

  return (
    <>
      <h1>MTA Datathon</h1>
      <div className="card">
        <ViolationsList selectedYear={selectedYear} />
        <GoogleMapsPolygons />
      </div>

      <YearSlider year={selectedYear} onYearChange={setSelectedYear} />
    </>
  )
}

export default App;
import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <h1>MTA Datathon</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          Maps and stuffs
        </button>
      </div>
    </>
  )
}

export default App

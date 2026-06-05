import { useState, useEffect } from 'react'
import { getHealth } from './services/api'

export default function App() {
  const [backendStatus, setBackendStatus] = useState('Connexion en cours...')

  useEffect(() => {
    getHealth()
      .then(data => setBackendStatus(`Backend ✓  |  Ollama : ${data.ollama}`))
      .catch(() => setBackendStatus('Impossible de joindre le backend'))
  }, [])

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '2rem' }}>
      <h1>Index</h1>
      <p>{backendStatus}</p>
    </div>
  )
}

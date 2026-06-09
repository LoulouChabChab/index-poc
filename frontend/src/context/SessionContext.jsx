import { createContext, useContext, useState } from 'react'

const SessionContext = createContext(null)

export function SessionProvider({ children }) {
  const [sessionId, setSessionId] = useState(null)
  const [sources, setSources] = useState({ A: null, B: null })
  const [context, setContext] = useState('')

  function setSource(slot, schema) {
    setSources(prev => ({ ...prev, [slot]: schema }))
  }

  function restoreSession(data) {
    setSessionId(data.session_id)
    setSources(data.sources || { A: null, B: null })
    setContext(data.context || '')
  }

  return (
    <SessionContext.Provider value={{ sessionId, setSessionId, sources, setSource, context, setContext, restoreSession }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  return useContext(SessionContext)
}

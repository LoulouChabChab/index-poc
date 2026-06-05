import { createContext, useContext, useState } from 'react'

const SessionContext = createContext(null)

export function SessionProvider({ children }) {
  const [sessionId, setSessionId] = useState(null)
  const [sources, setSources] = useState({ A: null, B: null })
  const [context, setContext] = useState('')

  function setSource(slot, schema) {
    setSources(prev => ({ ...prev, [slot]: schema }))
  }

  return (
    <SessionContext.Provider value={{ sessionId, setSessionId, sources, setSource, context, setContext }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  return useContext(SessionContext)
}

import { useEffect, useRef, useState } from 'react'

export default function StreamingText({ url, onDone }) {
  const [text, setText] = useState('')
  const [done, setDone] = useState(false)
  const esRef = useRef(null)

  useEffect(() => {
    if (!url) return
    setText('')
    setDone(false)

    const es = new EventSource(url)
    esRef.current = es

    es.onmessage = (e) => {
      if (e.data === '[DONE]') {
        setDone(true)
        es.close()
        onDone?.()
        return
      }
      setText(prev => prev + e.data)
    }

    es.onerror = () => {
      setDone(true)
      es.close()
      onDone?.()
    }

    return () => es.close()
  }, [url])

  return (
    <p style={{ margin: '0.5rem 0', color: '#333', lineHeight: 1.6 }}>
      {text}
      {!done && <span style={{ opacity: 0.4 }}>▋</span>}
    </p>
  )
}

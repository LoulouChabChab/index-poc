import { useEffect, useState } from 'react'
import { useSession } from '../../context/SessionContext'
import MappingCard from '../ui/MappingCard'
import ErrorMessage from '../ui/ErrorMessage'

const BASE = 'http://localhost:8000'

export default function StepMapping({ onDone }) {
  const { sessionId, sources } = useSession()
  const [mapping, setMapping] = useState(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [phase, setPhase] = useState('analyzing') // analyzing | mapping | unmatched
  const [unmatchedDecisions, setUnmatchedDecisions] = useState({})
  const [error, setError] = useState(null)

  useEffect(() => {
    analyze()
  }, [])

  async function analyze() {
    setError(null)
    setPhase('analyzing')
    try {
      const res = await fetch(`${BASE}/api/sessions/${sessionId}/analyze`, { method: 'POST' })
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setMapping(json.data)
      setPhase(json.data.proposals.length > 0 ? 'mapping' : 'unmatched')
    } catch (e) {
      setError(e.message)
      setPhase('error')
    }
  }

  async function handleConfirm(index) {
    try {
      await fetch(`${BASE}/api/sessions/${sessionId}/mappings/${index}/confirm`, { method: 'POST' })
    } catch (_) {}
    advance(index)
  }

  async function handleReject(index) {
    try {
      await fetch(`${BASE}/api/sessions/${sessionId}/mappings/${index}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
    } catch (_) {}
    advance(index)
  }

  function advance(index) {
    const next = index + 1
    if (next < mapping.proposals.length) {
      setCurrentIndex(next)
    } else {
      const allUnmatched = [
        ...mapping.unmatched_a.map(c => ({ col: c, source: 'A' })),
        ...mapping.unmatched_b.map(c => ({ col: c, source: 'B' })),
      ]
      if (allUnmatched.length > 0) {
        setPhase('unmatched')
      } else {
        onDone()
      }
    }
  }

  async function handleUnmatchedDone() {
    try {
      await fetch(`${BASE}/api/sessions/${sessionId}/mappings/unmatched`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decisions: unmatchedDecisions }),
      })
    } catch (_) {}
    onDone()
  }

  const allUnmatched = mapping
    ? [
        ...mapping.unmatched_a.map(c => ({ col: c, source: 'A' })),
        ...mapping.unmatched_b.map(c => ({ col: c, source: 'B' })),
      ]
    : []

  const allDecided = allUnmatched.every(({ col }) => unmatchedDecisions[col])

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Correspondances entre colonnes</h2>

      {phase === 'analyzing' && (
        <div style={styles.loading}>
          <div style={styles.spinner} />
          <p>L'IA analyse vos deux sources…</p>
        </div>
      )}

      {phase === 'error' && <ErrorMessage message={error} />}

      {phase === 'mapping' && mapping && (
        <>
          <p style={styles.progress}>
            Proposition {currentIndex + 1} / {mapping.proposals.length}
          </p>
          <MappingCard
            key={currentIndex}
            sessionId={sessionId}
            index={currentIndex}
            proposal={mapping.proposals[currentIndex]}
            schemaA={sources.A}
            schemaB={sources.B}
            onConfirm={() => handleConfirm(currentIndex)}
            onReject={() => handleReject(currentIndex)}
          />
        </>
      )}

      {phase === 'unmatched' && (
        <div>
          <p style={styles.subtitle}>
            Ces colonnes n'ont pas de correspondance dans l'autre source. Choisissez ce que vous souhaitez en faire.
          </p>
          <div style={styles.unmatchedList}>
            {allUnmatched.map(({ col, source }) => (
              <div key={col} style={styles.unmatchedRow}>
                <span style={styles.unmatchedCol}>
                  <span style={styles.sourceTag}>Source {source}</span> {col}
                </span>
                <div style={styles.toggleGroup}>
                  <button
                    style={{ ...styles.toggleBtn, ...(unmatchedDecisions[col] === 'include' ? styles.toggleActive : {}) }}
                    onClick={() => setUnmatchedDecisions(d => ({ ...d, [col]: 'include' }))}
                  >
                    Inclure
                  </button>
                  <button
                    style={{ ...styles.toggleBtn, ...(unmatchedDecisions[col] === 'exclude' ? styles.toggleActiveRed : {}) }}
                    onClick={() => setUnmatchedDecisions(d => ({ ...d, [col]: 'exclude' }))}
                  >
                    Exclure
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div style={styles.bulkActions}>
            <button style={styles.btnLink} onClick={() => {
              const all = {}
              allUnmatched.forEach(({ col }) => { all[col] = 'include' })
              setUnmatchedDecisions(all)
            }}>Tout inclure</button>
            <button style={styles.btnLink} onClick={() => {
              const all = {}
              allUnmatched.forEach(({ col }) => { all[col] = 'exclude' })
              setUnmatchedDecisions(all)
            }}>Tout exclure</button>
          </div>
          <button
            style={{ ...styles.btn, ...(allDecided ? {} : styles.btnDisabled) }}
            disabled={!allDecided}
            onClick={handleUnmatchedDone}
          >
            Générer l'aperçu
          </button>
        </div>
      )}
    </div>
  )
}

const styles = {
  container: { maxWidth: 760, margin: '0 auto', padding: '2rem 1rem', fontFamily: 'sans-serif' },
  title: { fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' },
  subtitle: { color: '#555', marginBottom: '1.5rem' },
  progress: { color: '#888', fontSize: '0.9rem', marginBottom: '1rem' },
  loading: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem 0', gap: '1rem', color: '#555' },
  spinner: {
    width: 36, height: 36, border: '4px solid #ddd', borderTop: '4px solid #2980b9',
    borderRadius: '50%', animation: 'spin 0.8s linear infinite',
  },
  unmatchedList: { marginBottom: '1rem' },
  unmatchedRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid #eee' },
  unmatchedCol: { fontSize: '0.95rem' },
  sourceTag: { background: '#e8f0fe', color: '#1a73e8', borderRadius: 4, padding: '0.1rem 0.4rem', fontSize: '0.75rem', fontWeight: 600, marginRight: '0.4rem' },
  toggleGroup: { display: 'flex', gap: '0.4rem' },
  toggleBtn: { padding: '0.35rem 0.9rem', border: '1px solid #ccc', borderRadius: 4, background: '#f8f9fa', cursor: 'pointer', fontSize: '0.85rem' },
  toggleActive: { background: '#27ae60', color: '#fff', border: '1px solid #27ae60' },
  toggleActiveRed: { background: '#e74c3c', color: '#fff', border: '1px solid #e74c3c' },
  bulkActions: { display: 'flex', gap: '1.5rem', marginBottom: '1.5rem' },
  btnLink: { background: 'none', border: 'none', color: '#2980b9', cursor: 'pointer', fontSize: '0.9rem', padding: 0 },
  btn: { display: 'block', width: '100%', padding: '0.9rem', fontSize: '1rem', fontWeight: 600, background: '#2980b9', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' },
  btnDisabled: { background: '#bdc3c7', cursor: 'not-allowed' },
}

import { useState } from 'react'
import ConfidenceBadge from './ConfidenceBadge'
import StreamingText from './StreamingText'
import ErrorMessage from './ErrorMessage'

const BASE = 'http://localhost:8000'

export default function MappingCard({ sessionId, index, proposal, schemaA, schemaB, onConfirm, onReject }) {
  const [streaming, setStreaming] = useState(true)
  const [rejectMode, setRejectMode] = useState(null) // null | 'manual' | 'nl'
  const [manualA, setManualA] = useState('')
  const [manualB, setManualB] = useState('')
  const [feedback, setFeedback] = useState('')
  const [refineUrl, setRefineUrl] = useState(null)
  const [refineText, setRefineText] = useState('')
  const [refineLoading, setRefineLoading] = useState(false)
  const [error, setError] = useState(null)

  const explainUrl = `${BASE}/api/sessions/${sessionId}/mappings/${index}/explain`
  const samplesA = _getSamples(schemaA, proposal.col_a)
  const samplesB = _getSamples(schemaB, proposal.col_b)

  async function handleManualConfirm() {
    if (!manualA || !manualB) return
    try {
      await rejectWithManual(sessionId, index, manualA, manualB)
      onConfirm()
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleNlRefine() {
    if (!feedback.trim()) return
    setRefineLoading(true)
    setRefineText('')
    setError(null)
    try {
      const res = await fetch(`${BASE}/api/sessions/${sessionId}/mappings/${index}/refine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback }),
      })
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let full = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const text = decoder.decode(value)
        const lines = text.split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const chunk = line.slice(6)
            if (chunk === '[DONE]') break
            full += chunk
            setRefineText(full)
          }
        }
      }
      // Try to parse JSON from response to auto-apply
      const match = full.match(/\{.*\}/s)
      if (match) {
        const parsed = JSON.parse(match[0])
        if (!parsed.error && parsed.col_a && parsed.col_b) {
          await rejectWithManual(sessionId, index, parsed.col_a, parsed.col_b)
          onConfirm()
          return
        }
        if (parsed.error) setError(parsed.error)
      }
    } catch (e) {
      setError("Une erreur est survenue. Essayez une correction manuelle.")
    } finally {
      setRefineLoading(false)
    }
  }

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <ConfidenceBadge level={proposal.confidence} />
      </div>

      <div style={styles.columns}>
        <ColBlock label="Source A" col={proposal.col_a} samples={samplesA} />
        <div style={styles.arrow}>↔</div>
        <ColBlock label="Source B" col={proposal.col_b} samples={samplesB} />
      </div>

      <div style={styles.explanation}>
        <StreamingText url={explainUrl} onDone={() => setStreaming(false)} />
      </div>

      {!rejectMode && (
        <div style={styles.actions}>
          <button style={{ ...styles.btn, ...styles.btnConfirm }} disabled={streaming} onClick={onConfirm}>
            Confirmer
          </button>
          <button style={{ ...styles.btn, ...styles.btnReject }} disabled={streaming} onClick={() => setRejectMode('choose')}>
            Rejeter
          </button>
        </div>
      )}

      {rejectMode === 'choose' && (
        <div style={styles.rejectChoice}>
          <p style={styles.rejectQuestion}>Comment souhaitez-vous corriger cette correspondance ?</p>
          <button style={{ ...styles.btn, ...styles.btnSecondary }} onClick={() => setRejectMode('manual')}>
            Choisir manuellement les colonnes
          </button>
          <button style={{ ...styles.btn, ...styles.btnSecondary }} onClick={() => setRejectMode('nl')}>
            Expliquer le problème à l'IA
          </button>
          <button style={styles.btnLink} onClick={() => { onReject(); setRejectMode(null) }}>
            Ignorer cette correspondance
          </button>
        </div>
      )}

      {rejectMode === 'manual' && (
        <div style={styles.rejectBlock}>
          <p style={styles.rejectQuestion}>Sélectionnez les colonnes à associer :</p>
          <div style={styles.selectRow}>
            <div style={styles.selectBlock}>
              <label style={styles.selectLabel}>Source A</label>
              <select style={styles.select} value={manualA} onChange={e => setManualA(e.target.value)}>
                <option value="">-- choisir --</option>
                {schemaA.columns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div style={styles.selectBlock}>
              <label style={styles.selectLabel}>Source B</label>
              <select style={styles.select} value={manualB} onChange={e => setManualB(e.target.value)}>
                <option value="">-- choisir --</option>
                {schemaB.columns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <ErrorMessage message={error} />
          <div style={styles.actions}>
            <button style={{ ...styles.btn, ...styles.btnConfirm }} disabled={!manualA || !manualB} onClick={handleManualConfirm}>
              Valider
            </button>
            <button style={styles.btnLink} onClick={() => setRejectMode('choose')}>Retour</button>
          </div>
        </div>
      )}

      {rejectMode === 'nl' && (
        <div style={styles.rejectBlock}>
          <p style={styles.rejectQuestion}>Expliquez le problème à l'IA :</p>
          <textarea
            style={styles.textarea}
            rows={3}
            placeholder="Ex : Ce n'est pas une seule colonne mais la combinaison du prénom et du nom de la source B…"
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
          />
          {refineText && <p style={{ color: '#555', marginTop: '0.5rem' }}>{refineText}</p>}
          <ErrorMessage message={error} />
          <div style={styles.actions}>
            <button style={{ ...styles.btn, ...styles.btnConfirm }} disabled={refineLoading || !feedback.trim()} onClick={handleNlRefine}>
              {refineLoading ? 'Analyse en cours…' : 'Envoyer à l'IA'}
            </button>
            <button style={styles.btnLink} onClick={() => setRejectMode('choose')}>Retour</button>
          </div>
        </div>
      )}
    </div>
  )
}

function ColBlock({ label, col, samples }) {
  return (
    <div style={styles.colBlock}>
      <span style={styles.colLabel}>{label}</span>
      <span style={styles.colName}>{col}</span>
      {samples.length > 0 && (
        <ul style={styles.samples}>
          {samples.slice(0, 4).map((s, i) => <li key={i}>{s}</li>)}
        </ul>
      )}
    </div>
  )
}

async function rejectWithManual(sessionId, index, colA, colB) {
  const res = await fetch(`http://localhost:8000/api/sessions/${sessionId}/mappings/${index}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ manual_col_a: colA, manual_col_b: colB }),
  })
  const json = await res.json()
  if (json.error) throw new Error(json.error)
}

function _getSamples(schema, colName) {
  const col = schema?.columns?.find(c => c.name === colName)
  return col?.samples || []
}

const styles = {
  card: { border: '1px solid #ddd', borderRadius: 10, padding: '1.5rem', marginBottom: '1.5rem', background: '#fff' },
  header: { marginBottom: '1rem' },
  columns: { display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' },
  colBlock: { flex: 1, background: '#f8f9fa', borderRadius: 6, padding: '0.75rem' },
  colLabel: { display: 'block', fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', marginBottom: '0.25rem' },
  colName: { display: 'block', fontWeight: 700, fontSize: '1rem', marginBottom: '0.5rem' },
  samples: { margin: 0, paddingLeft: '1.2rem', fontSize: '0.82rem', color: '#555' },
  arrow: { fontSize: '1.5rem', color: '#aaa', paddingTop: '1.2rem' },
  explanation: { borderTop: '1px solid #eee', paddingTop: '0.75rem', marginBottom: '1rem' },
  actions: { display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' },
  btn: { padding: '0.6rem 1.4rem', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.95rem' },
  btnConfirm: { background: '#27ae60', color: '#fff' },
  btnReject: { background: '#e74c3c', color: '#fff' },
  btnSecondary: { background: '#ecf0f1', color: '#333', marginBottom: '0.5rem' },
  btnLink: { background: 'none', border: 'none', color: '#2980b9', cursor: 'pointer', fontSize: '0.9rem', padding: '0.4rem 0' },
  rejectChoice: { borderTop: '1px solid #eee', paddingTop: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem' },
  rejectBlock: { borderTop: '1px solid #eee', paddingTop: '1rem' },
  rejectQuestion: { fontWeight: 600, marginBottom: '0.75rem' },
  selectRow: { display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.75rem' },
  selectBlock: { flex: 1, minWidth: 180 },
  selectLabel: { display: 'block', fontSize: '0.85rem', color: '#555', marginBottom: '0.3rem' },
  select: { width: '100%', padding: '0.5rem', borderRadius: 4, border: '1px solid #ccc', fontSize: '0.95rem' },
  textarea: { width: '100%', padding: '0.6rem', border: '1px solid #ccc', borderRadius: 6, fontSize: '0.95rem', resize: 'vertical', boxSizing: 'border-box', marginBottom: '0.5rem' },
}

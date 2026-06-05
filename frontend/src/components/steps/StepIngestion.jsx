import { useState } from 'react'
import { useSession } from '../../context/SessionContext'
import { createSession, uploadFile, fetchUrl } from '../../services/api'
import ErrorMessage from '../ui/ErrorMessage'

const SLOT_LABEL = { A: 'Source A', B: 'Source B' }

export default function StepIngestion({ onDone }) {
  const { sessionId, setSessionId, sources, setSource, context, setContext } = useSession()
  const [errors, setErrors] = useState({ A: null, B: null, global: null })
  const [loading, setLoading] = useState({ A: false, B: false })
  const [urlMode, setUrlMode] = useState({ A: false, B: false })
  const [urlInput, setUrlInput] = useState({ A: '', B: '' })
  const [sheetInfo, setSheetInfo] = useState({ A: null, B: null })

  async function ensureSession() {
    if (sessionId) return sessionId
    const { session_id } = await createSession()
    setSessionId(session_id)
    return session_id
  }

  async function handleFile(slot, file) {
    if (!file) return
    setLoading(l => ({ ...l, [slot]: true }))
    setErrors(e => ({ ...e, [slot]: null }))
    try {
      const sid = await ensureSession()
      const schema = await uploadFile(sid, slot, file)
      setSource(slot, schema)
      if (schema.available_sheets && schema.available_sheets.length > 1) {
        setSheetInfo(s => ({ ...s, [slot]: { file, available: schema.available_sheets, selected: schema.sheets || [] } }))
      }
    } catch (err) {
      setErrors(e => ({ ...e, [slot]: err.message }))
    } finally {
      setLoading(l => ({ ...l, [slot]: false }))
    }
  }

  async function handleUrl(slot) {
    const url = urlInput[slot].trim()
    if (!url) return
    setLoading(l => ({ ...l, [slot]: true }))
    setErrors(e => ({ ...e, [slot]: null }))
    try {
      const sid = await ensureSession()
      const schema = await fetchUrl(sid, slot, url)
      setSource(slot, schema)
    } catch (err) {
      setErrors(e => ({ ...e, [slot]: err.message }))
    } finally {
      setLoading(l => ({ ...l, [slot]: false }))
    }
  }

  async function handleAnalyze() {
    setErrors(e => ({ ...e, global: null }))
    try {
      onDone()
    } catch (err) {
      setErrors(e => ({ ...e, global: err.message }))
    }
  }

  const bothLoaded = sources.A && sources.B

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Index</h1>
      <p style={styles.subtitle}>Croisez deux sources de données en quelques minutes.</p>

      <div style={styles.sourcesRow}>
        {['A', 'B'].map(slot => (
          <SourceZone
            key={slot}
            slot={slot}
            label={SLOT_LABEL[slot]}
            schema={sources[slot]}
            loading={loading[slot]}
            error={errors[slot]}
            urlMode={urlMode[slot]}
            urlValue={urlInput[slot]}
            onToggleMode={() => setUrlMode(m => ({ ...m, [slot]: !m[slot] }))}
            onFile={file => handleFile(slot, file)}
            onUrlChange={v => setUrlInput(u => ({ ...u, [slot]: v }))}
            onUrlSubmit={() => handleUrl(slot)}
          />
        ))}
      </div>

      <div style={styles.contextBlock}>
        <label style={styles.contextLabel}>
          Contexte métier <span style={styles.optional}>(facultatif)</span>
        </label>
        <p style={styles.contextHint}>
          Plus vous décrivez votre contexte, mieux l'IA comprendra vos données.
        </p>
        <textarea
          style={styles.textarea}
          placeholder="Ex : Ces données concernent l'évaluation d'un dispositif d'aide aux entreprises sur 5 ans…"
          value={context}
          onChange={e => setContext(e.target.value)}
          rows={3}
        />
      </div>

      <ErrorMessage message={errors.global} />

      <button
        style={{ ...styles.btn, ...(bothLoaded ? {} : styles.btnDisabled) }}
        disabled={!bothLoaded}
        onClick={handleAnalyze}
      >
        Analyser
      </button>
    </div>
  )
}

function SourceZone({ slot, label, schema, loading, error, urlMode, urlValue, onToggleMode, onFile, onUrlChange, onUrlSubmit }) {
  function onDrop(e) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) onFile(file)
  }

  return (
    <div style={styles.zone}>
      <div style={styles.zoneHeader}>
        <span style={styles.zoneLabel}>{label}</span>
        <button style={styles.toggle} onClick={onToggleMode}>
          {urlMode ? 'Charger un fichier' : 'Utiliser une URL'}
        </button>
      </div>

      {urlMode ? (
        <div style={styles.urlRow}>
          <input
            style={styles.urlInput}
            type="url"
            placeholder="https://api.exemple.fr/data"
            value={urlValue}
            onChange={e => onUrlChange(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onUrlSubmit()}
          />
          <button style={styles.btnSmall} onClick={onUrlSubmit} disabled={loading}>
            {loading ? '…' : 'Charger'}
          </button>
        </div>
      ) : (
        <div
          style={{ ...styles.dropZone, ...(loading ? styles.dropZoneLoading : {}) }}
          onDragOver={e => e.preventDefault()}
          onDrop={onDrop}
          onClick={() => {
            const input = document.createElement('input')
            input.type = 'file'
            input.accept = '.csv,.xlsx,.xls'
            input.onchange = e => onFile(e.target.files[0])
            input.click()
          }}
        >
          {loading
            ? 'Chargement…'
            : 'Glissez un fichier ici ou cliquez pour parcourir\n(CSV, Excel)'}
        </div>
      )}

      {schema && !loading && (
        <div style={styles.schemaInfo}>
          <span style={styles.checkmark}>✓</span>
          {schema.file_name || schema.url}{' '}
          — {schema.columns.length} colonnes, {schema.row_count} lignes
        </div>
      )}

      <ErrorMessage message={error} />
    </div>
  )
}

const styles = {
  container: { maxWidth: 860, margin: '0 auto', padding: '2rem 1rem', fontFamily: 'sans-serif' },
  title: { fontSize: '2rem', fontWeight: 700, marginBottom: '0.25rem' },
  subtitle: { color: '#555', marginBottom: '2rem' },
  sourcesRow: { display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' },
  zone: { flex: 1, minWidth: 280, border: '1px solid #ddd', borderRadius: 8, padding: '1rem' },
  zoneHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' },
  zoneLabel: { fontWeight: 600 },
  toggle: { fontSize: '0.8rem', color: '#2980b9', background: 'none', border: 'none', cursor: 'pointer', padding: 0 },
  dropZone: {
    border: '2px dashed #ccc', borderRadius: 6, padding: '2rem 1rem', textAlign: 'center',
    cursor: 'pointer', color: '#666', whiteSpace: 'pre-line', lineHeight: 1.6,
    transition: 'border-color 0.2s',
  },
  dropZoneLoading: { color: '#999', borderColor: '#aaa' },
  urlRow: { display: 'flex', gap: '0.5rem' },
  urlInput: { flex: 1, padding: '0.5rem', border: '1px solid #ccc', borderRadius: 4, fontSize: '0.9rem' },
  btnSmall: { padding: '0.5rem 1rem', background: '#2980b9', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' },
  schemaInfo: { marginTop: '0.75rem', fontSize: '0.85rem', color: '#27ae60' },
  checkmark: { marginRight: '0.4rem', fontWeight: 700 },
  contextBlock: { marginBottom: '1.5rem' },
  contextLabel: { fontWeight: 600, display: 'block', marginBottom: '0.25rem' },
  optional: { fontWeight: 400, color: '#888', fontSize: '0.85rem' },
  contextHint: { color: '#e67e22', fontSize: '0.85rem', margin: '0 0 0.5rem' },
  textarea: { width: '100%', padding: '0.6rem', border: '1px solid #ccc', borderRadius: 6, fontSize: '0.95rem', resize: 'vertical', boxSizing: 'border-box' },
  btn: { display: 'block', width: '100%', padding: '0.9rem', fontSize: '1rem', fontWeight: 600, background: '#2980b9', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' },
  btnDisabled: { background: '#bdc3c7', cursor: 'not-allowed' },
}

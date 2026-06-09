import { useEffect, useState } from 'react'
import { useSession } from '../../context/SessionContext'
import ErrorMessage from '../ui/ErrorMessage'

const BASE = 'http://localhost:8000'
const FORMATS = [
  { value: 'csv',  label: 'CSV (.csv)' },
  { value: 'xlsx', label: 'Excel (.xlsx)' },
  { value: 'json', label: 'JSON (.json)' },
]

export default function StepPreview({ onCorrect }) {
  const { sessionId } = useSession()
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [exportFmt, setExportFmt] = useState('csv')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    loadPreview()
  }, [])

  async function loadPreview() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${BASE}/api/sessions/${sessionId}/preview`)
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setPreview(json.data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleExport() {
    setExporting(true)
    try {
      const res = await fetch(`${BASE}/api/sessions/${sessionId}/export?fmt=${exportFmt}`, { method: 'POST' })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.detail || 'Erreur lors de l\'export')
      }
      const blob = await res.blob()
      const disposition = res.headers.get('Content-Disposition') || ''
      const match = disposition.match(/filename="(.+)"/)
      const filename = match ? match[1] : `index_export.${exportFmt}`
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(e.message)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Aperçu du dataset fusionné</h2>

      {loading && (
        <div style={styles.loading}>
          <div style={styles.spinner} />
          <p>Génération de l'aperçu…</p>
        </div>
      )}

      <ErrorMessage message={error} />

      {preview && !loading && (
        <>
          <p style={styles.summary}>
            {preview.total_rows} lignes · {preview.total_cols} colonnes
            {preview.join_key && <span style={styles.note}> — joint sur <strong>{preview.join_key}</strong></span>}
            {preview.total_rows > 25 && <span style={styles.note}> — aperçu des 25 premières lignes</span>}
          </p>

          {preview.has_duplicates && (
            <div style={styles.warning}>
              <strong>Attention :</strong> la jointure a généré {preview.duplicate_count} ligne{preview.duplicate_count > 1 ? 's' : ''} en doublon,
              ce qui indique que la colonne de jointure n'est pas unique dans l'une des sources.
              Vérifiez vos données ou corrigez le mapping.
            </div>
          )}

          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  {preview.columns.map(col => (
                    <th key={col} style={styles.th}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row, i) => (
                  <tr key={i} style={i % 2 === 0 ? styles.rowEven : {}}>
                    {preview.columns.map(col => (
                      <td key={col} style={styles.td}>{String(row[col] ?? '')}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={styles.exportBlock}>
            <h3 style={styles.exportTitle}>Exporter le dataset complet</h3>
            <div style={styles.exportRow}>
              {FORMATS.map(f => (
                <label key={f.value} style={styles.radioLabel}>
                  <input
                    type="radio"
                    name="fmt"
                    value={f.value}
                    checked={exportFmt === f.value}
                    onChange={() => setExportFmt(f.value)}
                  />
                  {' '}{f.label}
                </label>
              ))}
            </div>
            <button style={styles.btnExport} disabled={exporting} onClick={handleExport}>
              {exporting ? 'Préparation…' : 'Télécharger'}
            </button>
          </div>

          <button style={styles.btnCorrect} onClick={onCorrect}>
            Corriger le mapping
          </button>
        </>
      )}
    </div>
  )
}

const styles = {
  container: { maxWidth: 1000, margin: '0 auto', padding: '2rem 1rem', fontFamily: 'sans-serif' },
  title: { fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' },
  summary: { color: '#555', marginBottom: '1rem' },
  note: { color: '#888', fontSize: '0.85rem' },
  loading: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem 0', gap: '1rem', color: '#555' },
  spinner: { width: 36, height: 36, border: '4px solid #ddd', borderTop: '4px solid #2980b9', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  tableWrapper: { overflowX: 'auto', marginBottom: '2rem', border: '1px solid #e0e0e0', borderRadius: 8 },
  table: { borderCollapse: 'collapse', width: '100%', fontSize: '0.85rem' },
  th: { background: '#f0f4f8', padding: '0.6rem 0.8rem', textAlign: 'left', fontWeight: 600, borderBottom: '2px solid #ddd', whiteSpace: 'nowrap' },
  td: { padding: '0.5rem 0.8rem', borderBottom: '1px solid #f0f0f0', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  rowEven: { background: '#fafafa' },
  exportBlock: { background: '#f8f9fa', borderRadius: 8, padding: '1.25rem', marginBottom: '1.5rem' },
  exportTitle: { fontWeight: 600, marginBottom: '0.75rem', fontSize: '1rem' },
  exportRow: { display: 'flex', gap: '1.5rem', marginBottom: '1rem', flexWrap: 'wrap' },
  radioLabel: { display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.95rem' },
  btnExport: { padding: '0.7rem 2rem', background: '#27ae60', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: '1rem' },
  btnCorrect: { background: 'none', border: '1px solid #bdc3c7', padding: '0.6rem 1.4rem', borderRadius: 6, cursor: 'pointer', color: '#555', fontSize: '0.9rem' },
  warning: {
    background: '#fff8e1', border: '1px solid #f9a825', borderRadius: 6,
    padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.9rem', color: '#5d4037',
  },
}

import { useEffect, useState, useRef } from 'react'
import { useSession } from '../../context/SessionContext'
import MappingCard from '../ui/MappingCard'
import ErrorMessage from '../ui/ErrorMessage'

const BASE = 'http://localhost:8000'

const CONFIDENCE_COLOR = { high: '#27ae60', medium: '#e67e22', low: '#e74c3c' }
const CONFIDENCE_FR    = { high: 'élevée',  medium: 'moyenne', low: 'faible'  }
const STATUS_LABEL = { confirmed: 'Confirmé', rejected: 'Rejeté', pending: 'En attente' }
const STATUS_COLOR = { confirmed: '#27ae60',  rejected: '#e74c3c', pending: '#aaa' }

export default function StepMapping({ onDone, skipAnalysis }) {
  const { sessionId, sources } = useSession()
  const [mapping, setMapping] = useState(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [phase, setPhase] = useState('analyzing') // analyzing | mapping | unmatched | preview
  const [unmatchedDecisions, setUnmatchedDecisions] = useState({})
  const [error, setError] = useState(null)
  const [showOverview, setShowOverview] = useState(false)
  const [miniPreview, setMiniPreview] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [analysisDuration, setAnalysisDuration] = useState(null)
  const timerRef = useRef(null)
  const elapsedRef = useRef(0)

  useEffect(() => {
    if (skipAnalysis) {
      loadExisting()
    } else {
      analyze()
    }
  }, [])

  useEffect(() => {
    if (phase === 'analyzing') {
      elapsedRef.current = 0
      setElapsed(0)
      timerRef.current = setInterval(() => {
        elapsedRef.current += 1
        setElapsed(elapsedRef.current)
      }, 1000)
    } else {
      clearInterval(timerRef.current)
      if (phase === 'mapping' || phase === 'unmatched') {
        setAnalysisDuration(elapsedRef.current)
      }
    }
    return () => clearInterval(timerRef.current)
  }, [phase])

  async function analyze() {
    setError(null)
    setPhase('analyzing')
    try {
      const res = await fetch(`${BASE}/api/sessions/${sessionId}/analyze`, { method: 'POST' })
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      // Poll until done
      await pollAnalysis()
    } catch (e) {
      setError(e.message)
      setPhase('error')
    }
  }

  async function pollAnalysis() {
    while (true) {
      await new Promise(r => setTimeout(r, 3000))
      const res = await fetch(`${BASE}/api/sessions/${sessionId}/analyze/status`)
      const json = await res.json()
      if (json.data.status === 'error') throw new Error(json.data.error || 'Erreur d\'analyse')
      if (json.data.status === 'done') {
        const data = json.data.mapping
        setMapping(data)
        setCurrentIndex(0)
        setPhase(data.proposals.length > 0 ? 'mapping' : 'unmatched')
        return
      }
    }
  }

  async function loadExisting() {
    setError(null)
    setPhase('analyzing')
    try {
      const res = await fetch(`${BASE}/api/sessions/${sessionId}/mappings`)
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      const data = json.data
      const resumeIndex = data.proposals.findIndex(p => p.status === 'pending')
      if (resumeIndex === -1) {
        setMapping(data)
        setCurrentIndex(data.proposals.length)
        const allUnmatched = [...data.unmatched_a, ...data.unmatched_b]
        setPhase(allUnmatched.length > 0 ? 'unmatched' : 'mapping')
      } else {
        setMapping(data)
        setCurrentIndex(resumeIndex)
        setPhase('mapping')
      }
    } catch (e) {
      setError(e.message)
      setPhase('error')
    }
  }

  async function handleConfirm(index, keep = 'a') {
    try {
      await fetch(`${BASE}/api/sessions/${sessionId}/mappings/${index}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keep }),
      })
    } catch (_) {}
    // Update local state so overview reflects the change immediately
    setMapping(m => {
      const proposals = [...m.proposals]
      proposals[index] = { ...proposals[index], status: 'confirmed' }
      return { ...m, proposals }
    })
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
    setMapping(m => {
      const proposals = [...m.proposals]
      proposals[index] = { ...proposals[index], status: 'rejected' }
      return { ...m, proposals }
    })
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
        loadMiniPreview()
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
    loadMiniPreview()
  }

  async function loadMiniPreview() {
    setPreviewLoading(true)
    setPreviewError(null)
    setPhase('preview')
    try {
      const res = await fetch(`${BASE}/api/sessions/${sessionId}/preview`)
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setMiniPreview(json.data)
    } catch (e) {
      setPreviewError(e.message)
    } finally {
      setPreviewLoading(false)
    }
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

      {/* ── Analyse en cours ── */}
      {phase === 'analyzing' && (
        <div style={styles.loading}>
          <div style={styles.spinner} />
          <p style={{ margin: 0 }}>L'IA analyse vos deux sources…</p>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#888' }}>
            {Math.floor(elapsed / 60) > 0 && `${Math.floor(elapsed / 60)} min `}{elapsed % 60} s écoulées
          </p>
          {sources.A && sources.B && (
            <div style={styles.columnPreview}>
              <ColumnList label="Source A" columns={sources.A.columns} />
              <ColumnList label="Source B" columns={sources.B.columns} />
            </div>
          )}
        </div>
      )}

      {/* ── Erreur + retry ── */}
      {phase === 'error' && (
        <div>
          <ErrorMessage message={error} />
          <button style={styles.btnRetry} onClick={analyze}>
            Réessayer l'analyse
          </button>
        </div>
      )}

      {/* ── Mapping proposition par proposition ── */}
      {phase === 'mapping' && mapping && (
        <>
          {analysisDuration !== null && (
            <div style={styles.durationBadge}>
              Analyse IA terminée en {Math.floor(analysisDuration / 60) > 0 ? `${Math.floor(analysisDuration / 60)} min ` : ''}{analysisDuration % 60} s
            </div>
          )}
          <div style={styles.progressBar}>
            <span style={styles.progressText}>
              Proposition {currentIndex + 1} / {mapping.proposals.length}
            </span>
            <button style={styles.btnOverview} onClick={() => setShowOverview(v => !v)}>
              {showOverview ? 'Masquer le récapitulatif' : 'Voir toutes les propositions'}
            </button>
          </div>

          {showOverview && (
            <OverviewPanel
              proposals={mapping.proposals}
              currentIndex={currentIndex}
              onJump={i => { setCurrentIndex(i); setShowOverview(false) }}
            />
          )}

          <MappingCard
            key={currentIndex}
            sessionId={sessionId}
            index={currentIndex}
            proposal={mapping.proposals[currentIndex]}
            schemaA={sources.A}
            schemaB={sources.B}
            onConfirm={(keep) => handleConfirm(currentIndex, keep)}
            onReject={() => handleReject(currentIndex)}
          />
        </>
      )}

      {/* ── Colonnes sans correspondance ── */}
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

      {/* ── Prévisualisation avant confirmation ── */}
      {phase === 'preview' && (
        <div>
          <h3 style={styles.previewTitle}>Aperçu de la fusion</h3>
          <p style={styles.previewHint}>
            Voici les 5 premières lignes du dataset fusionné. Vérifiez que la jointure est correcte avant de continuer.
          </p>
          {previewLoading && (
            <div style={styles.loading}>
              <div style={styles.spinner} />
              <p style={{ margin: 0 }}>Calcul de la fusion…</p>
            </div>
          )}
          {previewError && <ErrorMessage message={previewError} />}
          {miniPreview && !previewLoading && (
            <>
              {miniPreview.has_duplicates && (
                <div style={styles.warningBanner}>
                  Attention : {miniPreview.duplicate_count} ligne{miniPreview.duplicate_count > 1 ? 's' : ''} dupliquée{miniPreview.duplicate_count > 1 ? 's' : ''} détectée{miniPreview.duplicate_count > 1 ? 's' : ''} — la clé de jointure n'est pas unique dans une des sources.
                </div>
              )}
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      {miniPreview.columns.map(c => (
                        <th key={c} style={styles.th}>{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {miniPreview.rows.slice(0, 5).map((row, i) => (
                      <tr key={i} style={i % 2 === 1 ? styles.trAlt : {}}>
                        {miniPreview.columns.map(c => (
                          <td key={c} style={styles.td}>{String(row[c] ?? '')}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p style={styles.previewMeta}>
                {miniPreview.total_rows} lignes · {miniPreview.total_cols} colonnes
                {miniPreview.join_key && <> · Clé : <strong>{miniPreview.join_key}</strong></>}
              </p>
            </>
          )}
          <button style={styles.btn} onClick={onDone} disabled={previewLoading}>
            Confirmer et voir l'aperçu complet
          </button>
        </div>
      )}
    </div>
  )
}

function ColumnList({ label, columns }) {
  return (
    <div style={{ flex: 1, minWidth: 200 }}>
      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#888', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
        {label}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
        {columns.map(c => (
          <span key={c.name} style={{
            background: '#e8f0fe', color: '#1a73e8', borderRadius: 4,
            padding: '0.15rem 0.5rem', fontSize: '0.8rem',
          }}>
            {c.name}
          </span>
        ))}
      </div>
    </div>
  )
}

function OverviewPanel({ proposals, currentIndex, onJump }) {
  return (
    <div style={overviewStyles.panel}>
      <div style={overviewStyles.title}>Toutes les propositions</div>
      <div style={overviewStyles.list}>
        {proposals.map((p, i) => (
          <div
            key={i}
            style={{
              ...overviewStyles.row,
              ...(i === currentIndex ? overviewStyles.rowActive : {}),
              cursor: p.status === 'pending' ? 'pointer' : 'default',
            }}
            onClick={() => p.status === 'pending' && onJump(i)}
            title={p.status === 'pending' ? 'Cliquer pour aller à cette proposition' : ''}
          >
            <span style={{ color: CONFIDENCE_COLOR[p.confidence], fontWeight: 700, fontSize: '0.75rem', minWidth: 52 }}>
              {CONFIDENCE_FR[p.confidence]}
            </span>
            <span style={overviewStyles.cols}>{p.col_a} ↔ {p.col_b}</span>
            <span style={{ color: STATUS_COLOR[p.status], fontSize: '0.78rem', fontWeight: 600 }}>
              {STATUS_LABEL[p.status]}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

const overviewStyles = {
  panel: {
    border: '1px solid #dde3ed', borderRadius: 8, background: '#f8f9fa',
    padding: '1rem', marginBottom: '1rem',
  },
  title: { fontWeight: 700, fontSize: '0.85rem', color: '#555', marginBottom: '0.6rem' },
  list: { display: 'flex', flexDirection: 'column', gap: '0.25rem' },
  row: {
    display: 'flex', alignItems: 'center', gap: '0.75rem',
    padding: '0.35rem 0.5rem', borderRadius: 5, fontSize: '0.88rem',
  },
  rowActive: { background: '#e8f0fe' },
  cols: { flex: 1, color: '#333' },
}

const styles = {
  container: { maxWidth: 760, margin: '0 auto', padding: '2rem 1rem', fontFamily: 'sans-serif' },
  title: { fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' },
  subtitle: { color: '#555', marginBottom: '1.5rem' },
  progressBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' },
  progressText: { color: '#888', fontSize: '0.9rem' },
  btnOverview: {
    background: 'none', border: '1px solid #bdc3c7', borderRadius: 4,
    padding: '0.3rem 0.7rem', fontSize: '0.8rem', color: '#555', cursor: 'pointer',
  },
  loading: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '2.5rem 0', gap: '1rem', color: '#555',
  },
  columnPreview: {
    display: 'flex', gap: '2rem', flexWrap: 'wrap', marginTop: '0.5rem',
    background: '#f8f9fa', borderRadius: 8, padding: '1rem', width: '100%', maxWidth: 580,
  },
  spinner: {
    width: 36, height: 36, border: '4px solid #ddd', borderTop: '4px solid #2980b9',
    borderRadius: '50%', animation: 'spin 0.8s linear infinite',
  },
  btnRetry: {
    marginTop: '1rem', padding: '0.6rem 1.5rem', background: '#2980b9', color: '#fff',
    border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: '0.95rem',
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
  previewTitle: { fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.25rem' },
  previewHint: { color: '#555', fontSize: '0.9rem', marginBottom: '1rem' },
  previewMeta: { fontSize: '0.82rem', color: '#888', margin: '0.5rem 0 1.5rem' },
  tableWrapper: { overflowX: 'auto', marginBottom: '0.25rem', border: '1px solid #e0e0e0', borderRadius: 6 },
  table: { borderCollapse: 'collapse', width: '100%', fontSize: '0.83rem' },
  th: { background: '#f0f4f8', padding: '0.5rem 0.75rem', textAlign: 'left', fontWeight: 600, color: '#444', whiteSpace: 'nowrap', borderBottom: '1px solid #dde3ed' },
  td: { padding: '0.4rem 0.75rem', color: '#333', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  trAlt: { background: '#f8f9fa' },
  durationBadge: {
    display: 'inline-block', background: '#eaf4fb', color: '#2980b9',
    border: '1px solid #aed6f1', borderRadius: 6, padding: '0.3rem 0.8rem',
    fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.75rem',
  },
  warningBanner: { background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 6, padding: '0.6rem 0.9rem', fontSize: '0.88rem', color: '#856404', marginBottom: '1rem' },
}

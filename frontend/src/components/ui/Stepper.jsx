const STEPS = [
  { key: 'ingestion', label: 'Sources' },
  { key: 'mapping',   label: 'Mapping' },
  { key: 'preview',   label: 'Aperçu & Export' },
]

export default function Stepper({ current }) {
  const currentIdx = STEPS.findIndex(s => s.key === current)

  return (
    <div style={styles.wrapper}>
      {STEPS.map((step, i) => {
        const done = i < currentIdx
        const active = i === currentIdx
        return (
          <div key={step.key} style={styles.item}>
            <div style={{
              ...styles.circle,
              ...(done ? styles.circleDone : active ? styles.circleActive : styles.circleIdle),
            }}>
              {done ? '✓' : i + 1}
            </div>
            <span style={{
              ...styles.label,
              ...(active ? styles.labelActive : done ? styles.labelDone : {}),
            }}>
              {step.label}
            </span>
            {i < STEPS.length - 1 && (
              <div style={{ ...styles.line, ...(done ? styles.lineDone : {}) }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

const styles = {
  wrapper: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '1.25rem 1rem 0', fontFamily: 'sans-serif', gap: 0,
  },
  item: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  circle: {
    width: 28, height: 28, borderRadius: '50%', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    fontSize: '0.8rem', fontWeight: 700, flexShrink: 0,
  },
  circleActive: { background: '#2980b9', color: '#fff' },
  circleDone:   { background: '#27ae60', color: '#fff' },
  circleIdle:   { background: '#e0e0e0', color: '#888' },
  label:     { fontSize: '0.85rem', color: '#aaa', whiteSpace: 'nowrap' },
  labelActive: { color: '#2980b9', fontWeight: 600 },
  labelDone:   { color: '#27ae60' },
  line:      { width: 48, height: 2, background: '#e0e0e0', margin: '0 0.5rem', flexShrink: 0 },
  lineDone:  { background: '#27ae60' },
}

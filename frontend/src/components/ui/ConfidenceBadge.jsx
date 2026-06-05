const CONFIG = {
  high:   { label: 'Confiance élevée',  bg: '#d4edda', color: '#155724' },
  medium: { label: 'Confiance moyenne', bg: '#fff3cd', color: '#856404' },
  low:    { label: 'Confiance faible',  bg: '#f8d7da', color: '#721c24' },
}

export default function ConfidenceBadge({ level }) {
  const cfg = CONFIG[level] || CONFIG.low
  return (
    <span style={{
      display: 'inline-block', padding: '0.2rem 0.6rem',
      borderRadius: 12, fontSize: '0.8rem', fontWeight: 600,
      background: cfg.bg, color: cfg.color,
    }}>
      {cfg.label}
    </span>
  )
}

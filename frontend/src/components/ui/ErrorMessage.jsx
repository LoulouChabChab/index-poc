export default function ErrorMessage({ message }) {
  if (!message) return null
  return (
    <p style={{ color: '#c0392b', background: '#fdecea', padding: '0.6rem 1rem', borderRadius: 6, margin: '0.5rem 0' }}>
      {message}
    </p>
  )
}

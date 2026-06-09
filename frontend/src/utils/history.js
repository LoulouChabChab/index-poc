const KEY = 'index_history'
const MAX = 5

export function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]')
  } catch {
    return []
  }
}

export function saveToHistory(entry) {
  // entry: { session_id, created_at, label_a, label_b, last_step }
  const history = loadHistory().filter(e => e.session_id !== entry.session_id)
  history.unshift(entry)
  localStorage.setItem(KEY, JSON.stringify(history.slice(0, MAX)))
}

export function updateHistoryStep(session_id, last_step) {
  const history = loadHistory()
  const idx = history.findIndex(e => e.session_id === session_id)
  if (idx !== -1) {
    history[idx].last_step = last_step
    localStorage.setItem(KEY, JSON.stringify(history))
  }
}

export function removeFromHistory(session_id) {
  const history = loadHistory().filter(e => e.session_id !== session_id)
  localStorage.setItem(KEY, JSON.stringify(history))
}

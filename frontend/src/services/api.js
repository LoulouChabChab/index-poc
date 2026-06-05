const BASE = 'http://localhost:8000'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, options)
  const json = await res.json()
  if (json.error) throw new Error(json.error)
  return json.data
}

export function getHealth() {
  return request('/api/health')
}

export function createSession() {
  return request('/api/sessions', { method: 'POST' })
}

export async function uploadFile(sessionId, slot, file) {
  const form = new FormData()
  form.append('slot', slot)
  form.append('file', file)
  return request(`/api/sessions/${sessionId}/sources/upload`, { method: 'POST', body: form })
}

export function fetchUrl(sessionId, slot, url, headers = {}, params = {}) {
  return request(`/api/sessions/${sessionId}/sources/fetch-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slot, url, headers, params }),
  })
}

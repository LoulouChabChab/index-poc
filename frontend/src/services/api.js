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

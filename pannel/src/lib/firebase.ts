/** Firebase Realtime Database REST helpers */

function cleanUrl(url: string): string {
  let u = url.trim().replace(/\/+$/, '')
  if (!u.startsWith('http')) u = 'https://' + u
  if (!u.includes('firebaseio.com') && !u.includes('firebasedatabase.app')) {
    // allow custom / still pass through
  }
  return u
}

function authParam(key: string): string {
  // Database secret uses auth=, API key uses access_token= or auth= depending on setup.
  // Most legacy RTDB secrets work with ?auth=SECRET
  return `auth=${encodeURIComponent(key)}`
}

export async function fetchPath<T = unknown>(
  baseUrl: string,
  path: string,
  key: string
): Promise<T | null> {
  const url = `${cleanUrl(baseUrl)}/${path.replace(/^\//, '')}.json?${authParam(key)}`
  const res = await fetch(url)
  if (res.status === 401 || res.status === 403) {
    throw new Error('PERMISSION_DENIED')
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

export async function setPath(
  baseUrl: string,
  path: string,
  key: string,
  data: unknown
): Promise<void> {
  const url = `${cleanUrl(baseUrl)}/${path.replace(/^\//, '')}.json?${authParam(key)}`
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (res.status === 401 || res.status === 403) {
    throw new Error('PERMISSION_DENIED')
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`)
  }
}

export async function validateConnection(baseUrl: string, key: string): Promise<boolean> {
  try {
    await fetchPath(baseUrl, 'clients', key)
    return true
  } catch (e) {
    if (e instanceof Error && e.message === 'PERMISSION_DENIED') throw e
    // empty / null is still valid
    return true
  }
}

export function encodeShareLink(url: string, key: string): string {
  const payload = btoa(JSON.stringify({ u: url, k: key }))
  return `${window.location.origin}${window.location.pathname}#c=${payload}`
}

export function decodeShareLink(hash: string): { url: string; key: string } | null {
  const m = hash.match(/#c=([A-Za-z0-9+/=]+)/)
  if (!m) return null
  try {
    const obj = JSON.parse(atob(m[1]))
    if (obj.u && obj.k) return { url: obj.u, key: obj.k }
  } catch { /* ignore */ }
  return null
}

/** Very lightweight APK string scan for firebase urls / keys (client-side only) */
export async function extractFromApk(file: File): Promise<{ url?: string; key?: string }> {
  const buf = await file.arrayBuffer()
  // decode as latin1 so binary doesn't break
  const text = new TextDecoder('latin1').decode(buf)
  const urlMatch = text.match(/https:\/\/[a-z0-9-]+\.(?:firebaseio\.com|firebasedatabase\.app)(?:\/[^\s"']*)?/i)
  const keyMatch =
    text.match(/["']([A-Za-z0-9_-]{20,})["']/) || // rough
    text.match(/databaseURL["\s:=]+["']([^"']+)["']/i)

  // better key patterns often near google-services or BuildConfig
  const secretish = text.match(/(?:api[_-]?key|database[_-]?secret|firebase[_-]?key)["\s:=]+["']([A-Za-z0-9_-]{16,})["']/i)

  return {
    url: urlMatch?.[0],
    key: secretish?.[1] || keyMatch?.[1],
  }
}

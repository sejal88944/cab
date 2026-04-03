/**
 * VITE_BASE_URL must be a full absolute URL in production (https://api.example.com).
 * If only a hostname is set (common mistake), the browser treats requests as paths on the
 * frontend origin and API calls break with 405 / wrong host.
 */
export function getApiBaseUrl() {
  const raw = import.meta.env.VITE_BASE_URL || 'http://localhost:5001'
  let u = String(raw).trim().replace(/\/$/, '')
  if (!u) u = 'http://localhost:5001'
  if (/^https?:\/\//i.test(u)) return u
  if (u.startsWith('//')) return `https:${u}`
  if (
    /^(localhost|127\.0\.0\.1|\[::1\])/i.test(u) ||
    /^192\.168\.\d+\.\d+/.test(u) ||
    /^10\.\d+\.\d+\.\d+/.test(u) ||
    /^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+/.test(u)
  ) {
    return `http://${u}`
  }
  return `https://${u}`
}

export const API_BASE_URL = getApiBaseUrl()

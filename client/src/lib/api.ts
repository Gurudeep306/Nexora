/**
 * Where the API lives. Empty (the default) = same origin as the page, which is
 * how local dev (Vite proxy), tests and the single-host Render deploy work.
 * On the split deploy (site on Cloudflare Pages, API on its own host) the
 * Pages build sets VITE_API_URL=https://api.nexoraguru.in.
 */
export const API_BASE: string = String(import.meta.env.VITE_API_URL ?? '').trim().replace(/\/+$/, '')

/**
 * Turn a server path ("/api/x", "/auth/github", "/uploads/a.png") into a URL on
 * the API host. Absolute URLs, data:/blob: URLs and relative paths pass through.
 */
export function apiUrl(path: string): string {
  if (!API_BASE || !path.startsWith('/') || path.startsWith('//')) return path
  return API_BASE + path
}

/** Uploaded files (/uploads/...) are stored and served by the API host. */
export function assetUrl(src: string): string
export function assetUrl(src: string | null | undefined): string | undefined
export function assetUrl(src: string | null | undefined): string | undefined {
  if (!src) return src ?? undefined
  return src.startsWith('/uploads/') ? apiUrl(src) : src
}

export class ApiError extends Error {
  status: number
  data: unknown

  constructor(status: number, message: string, data?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
  query?: Record<string, string | number | boolean | undefined | null>
  timeoutMs?: number
}

async function request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  const { body, query, timeoutMs = 30000, headers, ...rest } = options

  let url = apiUrl(path)
  if (query) {
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') params.set(k, String(v))
    }
    const qs = params.toString()
    if (qs) url += `?${qs}`
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(url, {
      method,
      credentials: 'include',
      signal: controller.signal,
      headers: {
        ...(body instanceof FormData ? {} : body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
      ...rest,
    })

    const text = await res.text()
    let data: unknown
    try {
      data = text ? JSON.parse(text) : null
    } catch {
      data = text
    }

    if (!res.ok) {
      const message =
        (data as { error?: string; message?: string } | null)?.error ??
        (data as { error?: string; message?: string } | null)?.message ??
        `Request failed (${res.status})`
      throw new ApiError(res.status, message, data)
    }
    return data as T
  } catch (err) {
    if (err instanceof ApiError) throw err
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError(0, 'Request timed out')
    }
    throw new ApiError(0, 'Network error — is the server running?')
  } finally {
    clearTimeout(timer)
  }
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>('GET', path, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>('POST', path, { ...options, body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>('PUT', path, { ...options, body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>('PATCH', path, { ...options, body }),
  delete: <T>(path: string, options?: RequestOptions) => request<T>('DELETE', path, options),
}

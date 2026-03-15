'use client'

import useSWR, { type SWRConfiguration } from 'swr'

export async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`/api${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (res.status === 401) {
    // Try refresh (cookie sent automatically since path matches)
    const refreshRes = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    })

    if (refreshRes.ok) {
      // Retry original request with new cookie
      const retryRes = await fetch(`/api${path}`, {
        ...options,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      })
      if (!retryRes.ok) throw new Error('Request failed after token refresh')
      return retryRes.json()
    }

    // Redirect to login
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
    throw new Error('Unauthorized')
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(err.error || 'Request failed')
  }

  return res.json()
}

const fetcher = (path: string) => apiFetch(path)

export function useApi<T = unknown>(path: string | null, config?: SWRConfiguration) {
  return useSWR<T>(path, fetcher, {
    revalidateOnFocus: false,
    ...config,
  })
}

export async function apiPost(path: string, body: unknown) {
  return apiFetch(path, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function apiPut(path: string, body: unknown) {
  return apiFetch(path, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export async function apiDelete(path: string) {
  return apiFetch(path, { method: 'DELETE' })
}

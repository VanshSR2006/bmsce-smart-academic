/**
 * BMSCE Smart Academic — Centralized API Client Helper
 * Bulletproof routing supporting direct cloud URLs and edge reverse-proxy rewrites.
 */

export function getApiBaseUrl(): string {
  const rawBase = import.meta.env.VITE_API_BASE_URL || '/api/v1';
  return rawBase.replace(/\/$/, '');
}

export function getApiUrl(endpoint: string): string {
  // If already an absolute URL, return as-is
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }

  const base = getApiBaseUrl();
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  if (base.startsWith('http://') || base.startsWith('https://')) {
    // If base already contains /api/v1
    if (base.endsWith('/api/v1')) {
      const cleanPath = normalizedEndpoint.startsWith('/api/v1')
        ? normalizedEndpoint.slice('/api/v1'.length)
        : normalizedEndpoint;
      return `${base}${cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`}`;
    }
    // If base is a bare domain (e.g. https://bmsce-academic-api.onrender.com)
    if (normalizedEndpoint.startsWith('/api/v1')) {
      return `${base}${normalizedEndpoint}`;
    }
    return `${base}/api/v1${normalizedEndpoint}`;
  }

  // Relative mode (handled by Vite dev proxy, Docker nginx, or Vercel rewrites)
  if (normalizedEndpoint.startsWith('/api/v1')) {
    return normalizedEndpoint;
  }
  return `/api/v1${normalizedEndpoint}`;
}

export async function apiFetch(endpoint: string, init?: RequestInit): Promise<Response> {
  const url = getApiUrl(endpoint);
  return fetch(url, init);
}

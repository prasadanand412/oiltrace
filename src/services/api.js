export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8001"
).replace(/\/$/, "");

const TOKEN_KEY = "access_token";

export function getAccessToken() {
  return (
    window.localStorage.getItem(TOKEN_KEY) ||
    window.sessionStorage.getItem(TOKEN_KEY)
  );
}

export function storeAccessToken(token, remember = true) {
  const storage = remember ? window.localStorage : window.sessionStorage;
  const otherStorage = remember ? window.sessionStorage : window.localStorage;
  otherStorage.removeItem(TOKEN_KEY);
  storage.setItem(TOKEN_KEY, token);
}

export function clearAccessToken() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.sessionStorage.removeItem(TOKEN_KEY);
}

export async function apiRequest(path, options = {}) {
  const { authenticated = true, headers, ...requestOptions } = options;
  const token = authenticated ? getAccessToken() : null;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...requestOptions,
    headers: {
      ...headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.detail || "The OilTrace service could not complete the request.");
  }
  return data;
}

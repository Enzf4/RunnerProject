import { supabase } from './supabase'

// A API C# no Render está bloqueando chamadas do localhost por causa do CORS.
// Em dev (npm run dev), o Vite interceptará rotas começando com /api e as enviará ao Render (evita CORS).
// Em produção (npm run build), ou se o CORS for consertado no back, usa-se a absoluta.
// Sempre apontando para o Render para evitar erros 401 do proxy do Vite
const API_BASE_URL = 'https://api-projetointegrador-kmmg.onrender.com'

/**
 * Fetch wrapper that auto-injects the Supabase JWT into the Authorization header.
 * @param {string} path – API path (e.g. "/api/strava/login")
 * @param {RequestInit} options – standard fetch options
 */
export async function fetchWithAuth(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

  if (!token) throw new Error('Usuário não autenticado.')

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
    Authorization: `Bearer ${token}`,
  }

  return fetch(`${API_BASE_URL}${path}`, { ...options, headers })
}

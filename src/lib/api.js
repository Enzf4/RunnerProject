import { supabase } from './supabase'
import axios from 'axios'

// Sempre apontando para o Render para evitar erros 401 do proxy do Vite
const API_BASE_URL = 'https://api-projetointegrador-kmmg.onrender.com'

// Cria a instância do axios configurada
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  }
})

// Interceptor para injetar o token JWT automaticamente
api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession()

  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`
  }

  return config
}, (error) => {
  return Promise.reject(error)
})

// Retro-compatibilidade com o fetch api (Para não quebrar os arquivos atuais de imediato)
export async function fetchWithAuth(path, options = {}) {
  try {
    const response = await api({
      url: path,
      method: options.method || 'GET',
      data: options.body,
      ...options
    })
    
    // Simular o comportamento do Response.ok e text/json do fetch nativo para evitar reescrever as views
    return {
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      text: async () => typeof response.data === 'string' ? response.data : JSON.stringify(response.data),
      json: async () => response.data
    }
  } catch (error) {
    // Se for um erro do Axios (ex: 401), retorna em um objeto simulando Fetch para compatibilidade
    if (error.response) {
      return {
        ok: false,
        status: error.response.status,
        text: async () => typeof error.response.data === 'string' ? error.response.data : JSON.stringify(error.response.data),
        json: async () => error.response.data,
        error: error.response.data
      }
    }
    throw error
  }
}

import axios, { AxiosError } from 'axios'
import { getIdentity, setIdentity } from '@/lib/session'
import type { ApiError } from '@/types/contracts'

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 6000,
  withCredentials: true,
})

http.interceptors.request.use((request) => {
  const identity = getIdentity()
  if (identity.token) request.headers.Authorization = `Bearer ${identity.token}`
  return request
})
http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error instanceof AxiosError &&
      error.response?.status === 401 &&
      error.response.data?.code === 'SESSION_EXPIRED'
    ) {
      const usedToken = String(
        error.config?.headers?.Authorization || '',
      ).replace(/^Bearer /, '')
      if (usedToken && usedToken === getIdentity().token) {
        setIdentity({ token: '', userId: '' })
        window.dispatchEvent(new CustomEvent('kurio:expired'))
      }
    }
    return Promise.reject(error)
  },
)

export function errorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const body = error.response?.data as ApiError | undefined
    if (body?.message) return body.message
    if (error.code === 'ECONNABORTED')
      return 'A resposta demorou demais. Tente novamente.'
    if (!error.response)
      return 'Não foi possível conectar. Verifique a conexão e tente novamente.'
  }
  return 'Ocorreu um erro inesperado. Tente novamente.'
}

export function isNotFound(error: unknown): boolean {
  return error instanceof AxiosError && error.response?.status === 404
}

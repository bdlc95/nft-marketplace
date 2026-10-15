import { AxiosError } from 'axios'
export const fieldErrors = (error: unknown): Record<string, string> =>
  error instanceof AxiosError ? error.response?.data?.fields || {} : {}
export const errorCode = (error: unknown): string =>
  error instanceof AxiosError ? error.response?.data?.code || '' : ''

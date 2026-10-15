import { QueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: true,
      // Apenas consultas GET podem repetir. Não repita automaticamente 4xx.
      retry: (failureCount, error) => {
        if (
          error instanceof AxiosError &&
          error.response &&
          error.response.status < 500
        )
          return false
        return failureCount < 1
      },
    },
    mutations: { retry: false },
  },
})

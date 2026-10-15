import { AxiosError } from 'axios'
import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { redirect, useNavigate, useRouterState } from '@tanstack/react-router'
import { queryClient } from '@/app/query-client'
import { getIdentity, setIdentity, useIdentity } from '@/lib/session'
import type { Session } from '@/types/contracts'
import { privateKeys, sessionOptions } from './queries'
const privatePaths =
  /^(\/checkout|\/profile|\/wallets|\/favorites|\/orders)(\/|$)/
export async function installSession(session: Session | null) {
  await queryClient.cancelQueries({ queryKey: privateKeys.root })
  queryClient.removeQueries({ queryKey: privateKeys.root })
  queryClient.removeQueries({ queryKey: ['session'] })
  setIdentity({ token: session?.token || '', userId: session?.user.id || '' })
  if (session) queryClient.setQueryData(['session', session.token], session)
}
export function useSession() {
  const identity = useIdentity()
  const query = useQuery(sessionOptions())
  const user = query.data?.user || null
  return { ...query, user, identity }
}
export async function requireSession(href: string) {
  if (!getIdentity().token)
    throw redirect({ to: '/login', search: { redirect: href } })
  try {
    const session = await queryClient.fetchQuery({
      ...sessionOptions(),
      staleTime: 0,
    })
    if (!session.user) throw Error('Unauthenticated')
    return session
  } catch (error) {
    if (error instanceof AxiosError && error.response?.status !== 401)
      throw error
    throw redirect({ to: '/login', search: { redirect: href } })
  }
}
export function SessionMonitor() {
  const { user, identity, isPending, data } = useSession()
  const location = useRouterState({ select: (state) => state.location })
  const navigate = useNavigate()
  useEffect(() => {
    const expired = () => {
      void queryClient
        .cancelQueries({ queryKey: privateKeys.root })
        .then(() => queryClient.removeQueries({ queryKey: privateKeys.root }))
    }
    window.addEventListener('kurio:expired', expired)
    return () => window.removeEventListener('kurio:expired', expired)
  }, [])
  useEffect(() => {
    if (isPending) return
    if (!user && privatePaths.test(location.pathname))
      void navigate({
        to: '/login',
        search: { redirect: location.href, expired: true },
      })
  }, [
    user,
    isPending,
    location.href,
    location.pathname,
    navigate,
    identity.token,
  ])
  useEffect(() => {
    if (!data?.user) return
    const timer = setTimeout(
      () => {
        void queryClient.invalidateQueries({ queryKey: ['session'] })
      },
      Math.max(0, data.expiresAt - Date.now()),
    )
    return () => clearTimeout(timer)
  }, [data])
  return null
}

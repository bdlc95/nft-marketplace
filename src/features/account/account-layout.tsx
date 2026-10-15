import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { accountApi } from '@/services/commerce'
import { errorMessage } from '@/services/http'
import { defaultSearch } from '@/features/catalog/search'
import { FeatureInfo } from '@/components/feature-info'
import { installSession } from './session'
export function AccountLayout({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  const path = useRouterState({ select: (state) => state.location.pathname })
  const navigate = useNavigate()
  const logout = useMutation({
    mutationFn: async () => {
      try {
        await accountApi.logout()
      } finally {
        await installSession(null)
        void navigate({ to: '/', search: defaultSearch })
      }
    },
  })
  return (
    <div className="account-layout design-account">
      <aside className="account-sidebar">
        <h2>Meu perfil</h2>
        <nav aria-label="Sua conta">
          <Link className={path === '/profile' ? 'active' : ''} to="/profile">
            <img
              src="/assets/pdf/account-0.png"
              width="20"
              height="20"
              alt=""
            />
            Dados do perfil
          </Link>
          <Link className={path === '/wallets' ? 'active' : ''} to="/wallets">
            <img
              src="/assets/pdf/account-1.png"
              width="20"
              height="20"
              alt=""
            />
            Carteiras
          </Link>
          <FeatureInfo>
            <button type="button">
              <img
                src="/assets/pdf/account-2.png"
                width="20"
                height="20"
                alt=""
              />
              Atividade
            </button>
          </FeatureInfo>
          <Link
            className={path === '/favorites' ? 'active' : ''}
            to="/favorites"
          >
            <img
              src="/assets/pdf/account-3.png"
              width="20"
              height="20"
              alt=""
            />
            Lista de interesse
          </Link>
          {['Ofertas', 'Arquivos baixados', 'Suporte'].map((label, i) => (
            <FeatureInfo key={label}>
              <button type="button">
                <img
                  src={`/assets/pdf/account-${i + 4}.png`}
                  width="20"
                  height="20"
                  alt=""
                />
                {label}
              </button>
            </FeatureInfo>
          ))}
        </nav>
        <button
          className="account-logout"
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
        >
          <img src="/assets/pdf/account-7.png" width="20" height="20" alt="" />
          Sair
        </button>
        {logout.isError && <p role="alert">{errorMessage(logout.error)}</p>}
      </aside>
      <section className="account-content">
        {title && <h1>{title}</h1>}
        {children}
      </section>
    </div>
  )
}

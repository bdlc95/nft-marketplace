import { useRef, useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { FormField } from '@/components/form-field'
import { PasswordField } from '@/components/password-field'
import { FeatureInfo } from '@/components/feature-info'
import { CatalogPage } from '@/features/catalog/catalog-page'
import { defaultSearch } from '@/features/catalog/search'
import { accountApi } from '@/services/commerce'
import { errorMessage } from '@/services/http'
import { fieldErrors } from '@/lib/form-errors'
import { safeReturnPath } from '@/lib/session'
import { waitForCartWrites } from '@/features/commerce/cart-hooks'
import { installSession } from './session'
import type { RegisterInput, Session } from '@/types/contracts'

export function AuthPage({ signup = false }: { signup?: boolean }) {
  const search = useRouterState({
    select: (state) =>
      state.location.search as { redirect?: string; expired?: boolean },
  })
  const navigate = useNavigate()
  const dialog = useRef<HTMLDivElement>(null)
  const [form, setForm] = useState<RegisterInput>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const action = useMutation({
    mutationFn: async (provider?: 'google' | 'facebook') => {
      await waitForCartWrites()
      return provider
        ? accountApi.social(provider)
        : signup
          ? accountApi.register(form)
          : accountApi.login({ email: form.email, password: form.password })
    },
    onSuccess: async (session: Session) => {
      await installSession(session)
      void navigate({ href: safeReturnPath(search.redirect) })
    },
  })
  const errors = fieldErrors(action.error)
  const redirect = safeReturnPath(search.redirect)
  function change(name: keyof RegisterInput, value: string) {
    setForm((previous) => ({ ...previous, [name]: value }))
    action.reset()
  }
  function submit(event: FormEvent) {
    event.preventDefault()
    if (!action.isPending) action.mutate(undefined)
  }
  return (
    <>
      <div className="auth-backdrop" aria-hidden="true" inert>
        <CatalogPage background />
      </div>
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open) void navigate({ to: '/', search: defaultSearch })
        }}
      >
        <DialogContent
          ref={dialog}
          className={`auth-modal ${signup ? 'signup-modal' : 'login-modal'}`}
          overlayClassName="auth-overlay"
          showCloseButton={false}
          onOpenAutoFocus={(event) => {
            event.preventDefault()
            dialog.current?.focus()
          }}
        >
          <button
            className="auth-close desktop-only"
            type="button"
            aria-label="Fechar"
            onClick={() => void navigate({ to: '/', search: defaultSearch })}
          >
            ×
          </button>
          <Link
            className="auth-wordmark mobile-only"
            to="/"
            search={defaultSearch}
          >
            KURIO
          </Link>
          <DialogTitle className="auth-title">
            <span className="desktop-only auth-tabs">
              <Link
                className={!signup ? 'active' : ''}
                to="/login"
                search={{ redirect }}
              >
                Entrar
              </Link>
              <span aria-hidden="true">|</span>
              <Link
                className={signup ? 'active' : ''}
                to="/signup"
                search={{ redirect }}
              >
                Criar conta
              </Link>
            </span>
            <span className="mobile-only">
              {signup ? 'Criar perfil de colecionador' : 'Entrar'}
            </span>
          </DialogTitle>
          <DialogDescription className="auth-description desktop-only">
            {signup
              ? 'Crie seu perfil de colecionador e conecte uma carteira quando quiser.'
              : 'Entre para gerenciar sua carteira, coleção e perfil de criador.'}
          </DialogDescription>
          {search.expired && (
            <p role="alert" className="quote-warning">
              Sua sessão expirou. Entre novamente para retomar o fluxo.
            </p>
          )}
          <form noValidate onSubmit={submit} className="auth-form">
            {signup && (
              <FormField
                label="Nome de usuário"
                hideLabel
                name="name"
                autoComplete="username"
                placeholder="Nome de usuário"
                value={form.name}
                error={errors.name}
                onChange={(event) => change('name', event.target.value)}
              />
            )}
            <FormField
              label="E-mail"
              hideLabel
              name="email"
              type="email"
              autoComplete="email"
              placeholder={signup ? 'Digite seu e-mail' : 'contato@email.com'}
              value={form.email}
              error={errors.email}
              onChange={(event) => change('email', event.target.value)}
            />
            <PasswordField
              label="Senha"
              hideLabel
              name="password"
              autoComplete={signup ? 'new-password' : 'current-password'}
              placeholder={signup ? 'Senha' : '***********'}
              value={form.password}
              error={errors.password}
              onChange={(event) => change('password', event.target.value)}
            />
            {signup && (
              <PasswordField
                label="Confirmar senha"
                hideLabel
                name="confirmPassword"
                autoComplete="new-password"
                placeholder="Confirmar senha"
                value={form.confirmPassword}
                error={errors.confirmPassword}
                onChange={(event) =>
                  change('confirmPassword', event.target.value)
                }
              />
            )}
            {!signup && (
              <FeatureInfo message="A recuperação de senha não está disponível.">
                <button type="button" className="forgot-password">
                  Esqueceu a senha?
                </button>
              </FeatureInfo>
            )}
            {action.isError && (
              <p role="alert" className="form-error">
                {errorMessage(action.error)}
              </p>
            )}
            <Button
              className="auth-submit"
              type="submit"
              disabled={action.isPending}
            >
              {action.isPending ? (
                'Aguarde…'
              ) : signup ? (
                <>
                  <span className="desktop-only">Criar conta</span>
                  <span className="mobile-only">Criar perfil</span>
                </>
              ) : (
                'Entrar'
              )}
            </Button>
          </form>
          <div className="auth-divider">
            <span>Ou continue com</span>
          </div>
          <div className="auth-social">
            {(['google', 'facebook'] as const).map((provider) => (
              <Button
                key={provider}
                variant="outline"
                type="button"
                disabled={action.isPending}
                onClick={() => action.mutate(provider)}
              >
                <img
                  className="desktop-only"
                  src={`/assets/pdf/${provider}-desktop.png`}
                  width={provider === 'google' ? 20 : 10}
                  height={20}
                  alt=""
                />
                <img
                  className="mobile-only"
                  src={`/assets/pdf/${provider}-mobile.png`}
                  width={provider === 'google' ? 20 : 10}
                  height={20}
                  alt=""
                />
                Continuar com {provider === 'google' ? 'Google' : 'Facebook'}
              </Button>
            ))}
          </div>
          <p className="auth-switch mobile-only">
            {signup ? 'Já tem uma conta? ' : 'Novo na Kurio? '}
            <Link to={signup ? '/login' : '/signup'} search={{ redirect }}>
              {signup ? 'Entre' : 'Crie uma conta'}
            </Link>
          </p>
        </DialogContent>
      </Dialog>
    </>
  )
}
export function LoginPage() {
  return <AuthPage />
}
export function SignupPage() {
  return <AuthPage signup />
}

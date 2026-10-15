import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/error-state'
import { FormField } from '@/components/form-field'
import { PasswordField } from '@/components/password-field'
import { EnsField } from '@/components/ens-field'
import { accountApi } from '@/services/commerce'
import { errorMessage } from '@/services/http'
import { fieldErrors } from '@/lib/form-errors'
import { getIdentity, useIdentity } from '@/lib/session'
import type { User } from '@/types/contracts'
import { AccountLayout } from './account-layout'
import { privateKeys, profileOptions } from './queries'
export function ProfilePage() {
  const { userId } = useIdentity()
  const profile = useQuery(profileOptions(userId))
  return (
    <AccountLayout title="Perfil do colecionador">
      {profile.isPending ? (
        <Skeleton className="h-96" />
      ) : profile.isError ? (
        <ErrorState
          message={errorMessage(profile.error)}
          retry={() => void profile.refetch()}
        />
      ) : (
        <ProfileForm key={profile.data.id} initial={profile.data} />
      )}
    </AccountLayout>
  )
}
function ProfileForm({ initial }: { initial: User }) {
  const cache = useQueryClient()
  const identity = useIdentity()
  const [form, setForm] = useState(initial)
  const [uploadError, setUploadError] = useState('')
  const [readingAvatar, setReadingAvatar] = useState(false)
  const [password, setPassword] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const changePassword = useMutation({
    mutationFn: () => accountApi.password(password),
    onSuccess: () =>
      setPassword({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }),
  })
  const save = useMutation({
    mutationFn: async () => {
      const data = await accountApi.updateProfile({
        name: form.name,
        email: form.email,
        phone: form.phone,
        avatar: form.avatar,
        username: form.username,
        walletAlias: form.walletAlias,
        ens: form.ens,
      })
      if (Object.values(password).some(Boolean))
        await changePassword.mutateAsync()
      return data
    },
    onSuccess: (data) => {
      if (getIdentity().token !== identity.token) return
      cache.setQueryData(privateKeys.resource(identity.userId, 'profile'), data)
      void cache.invalidateQueries({ queryKey: ['session'] })
    },
  })
  const errors = fieldErrors(save.error)
  const passwordErrors = fieldErrors(changePassword.error)
  function change(name: keyof User, value: string) {
    setForm((previous) => ({ ...previous, [name]: value }))
    save.reset()
  }
  async function avatar(file?: File) {
    setUploadError('')
    if (!file) return
    if (
      !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ||
      file.size > 500_000
    ) {
      setUploadError('Use uma imagem PNG, JPEG ou WebP de até 500 KB.')
      return
    }
    setReadingAvatar(true)
    const value = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = reject
      reader.readAsDataURL(file)
    }).catch(() => '')
    setReadingAvatar(false)
    if (!value) {
      setUploadError('Não foi possível ler a imagem.')
      return
    }
    change('avatar', value)
  }
  function submit(event: FormEvent) {
    event.preventDefault()
    if (!save.isPending) save.mutate()
  }
  return (
    <form noValidate className="profile-form" onSubmit={submit}>
      <div className="profile-fields">
        <div className="profile-column">
          <FormField
            required
            label="Nome de exibição"
            name="name"
            value={form.name}
            error={errors.name}
            onChange={(event) => change('name', event.target.value)}
          />
          <FormField
            required
            label="E-mail"
            name="email"
            type="email"
            value={form.email}
            error={errors.email}
            onChange={(event) => change('email', event.target.value)}
          />
          <FormField
            required
            label="Apelido da carteira"
            name="walletAlias"
            value={form.walletAlias || ''}
            error={errors.walletAlias}
            onChange={(event) => change('walletAlias', event.target.value)}
          />
        </div>
        <div className="profile-column">
          <FormField
            required
            label="Nome de usuário"
            name="username"
            value={form.username || ''}
            error={errors.username}
            onChange={(event) => change('username', event.target.value)}
          />
          <EnsField
            value={form.ens || ''}
            error={errors.ens}
            onChange={(value) => change('ens', value)}
          />
          <div className="profile-avatar">
            <span>Avatar</span>
            <div>
              <img
                src={form.avatar || '/assets/pdf/avatar.png'}
                width="50"
                height="50"
                alt={form.avatar ? 'Prévia do seu avatar' : ''}
              />
              <label className="avatar-upload" htmlFor="avatar-file">
                Alterar
              </label>
              <input
                id="avatar-file"
                className="sr-only"
                aria-label="Imagem do avatar"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => void avatar(event.target.files?.[0])}
              />
              <button type="button" onClick={() => change('avatar', '')}>
                Remover
              </button>
            </div>
            {(uploadError || errors.avatar) && (
              <p role="alert" className="form-error">
                {uploadError || errors.avatar}
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="profile-passwords">
        <h2>Alterar senha</h2>
        {(['currentPassword', 'newPassword', 'confirmPassword'] as const).map(
          (name) => (
            <PasswordField
              key={name}
              tone="profile"
              label={
                {
                  currentPassword: 'Senha atual',
                  newPassword: 'Nova senha',
                  confirmPassword: 'Confirmar nova senha',
                }[name]
              }
              name={name}
              autoComplete={
                name === 'currentPassword' ? 'current-password' : 'new-password'
              }
              value={password[name]}
              error={passwordErrors[name]}
              onChange={(event) => {
                setPassword((previous) => ({
                  ...previous,
                  [name]: event.target.value,
                }))
                changePassword.reset()
                save.reset()
              }}
            />
          ),
        )}
      </div>
      {save.isError && (
        <p role="alert" className="form-error">
          {errorMessage(save.error)}
        </p>
      )}
      {save.isSuccess && (
        <p role="status">
          Perfil atualizado.{changePassword.isSuccess && ' Senha alterada.'}
        </p>
      )}
      <Button
        type="submit"
        disabled={save.isPending || readingAvatar || !!uploadError}
      >
        {save.isPending ? 'Salvando…' : 'Salvar'}
      </Button>
    </form>
  )
}

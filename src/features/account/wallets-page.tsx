import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/error-state'
import {
  WalletFields,
  blankWallet,
  type WalletFormValues,
} from '@/components/wallet-fields'
import { accountApi } from '@/services/commerce'
import { errorMessage } from '@/services/http'
import { fieldErrors } from '@/lib/form-errors'
import { getIdentity, useIdentity } from '@/lib/session'
import type { Network, Wallet } from '@/types/contracts'
import { AccountLayout } from './account-layout'
import { privateKeys, walletsOptions } from './queries'
import { useSession } from './session'
export function WalletsPage() {
  const identity = useIdentity()
  const result = useQuery(walletsOptions(identity.userId))
  const [newPrimary, setNewPrimary] = useState(false)
  const [newSecondary, setNewSecondary] = useState(false)
  const [same, setSame] = useState(false)
  const [saved, setSaved] = useState<'primary' | 'secondary' | ''>('')
  const primary = result.data?.find((wallet) => wallet.primary)
  const secondary = result.data?.find((wallet) => !wallet.primary)
  return (
    <AccountLayout title="">
      {result.isPending ? (
        <Skeleton className="h-96" />
      ) : result.isError ? (
        <ErrorState
          message={errorMessage(result.error)}
          retry={() => void result.refetch()}
        />
      ) : (
        <div className="wallets-design">
          <header className="wallet-heading-row">
            <h1>Carteira principal</h1>
            <button onClick={() => setNewPrimary(!newPrimary)}>
              Adicionar
            </button>
          </header>
          <p className="wallet-intro">
            Estas carteiras ficam disponíveis no pagamento e para receber NFTs
            comprados.
          </p>
          <WalletEditor
            key={newPrimary ? 'new-primary' : primary?.id || 'empty-primary'}
            wallet={newPrimary ? undefined : primary}
            primary
            onSaved={() => {
              setNewPrimary(false)
              setSaved('primary')
            }}
          />
          {saved === 'primary' && <p role="status">Carteira salva.</p>}
          <section className="secondary-wallet">
            <header className="wallet-heading-row">
              <h2>Carteira secundária</h2>
              <div>
                <label>
                  <input
                    type="checkbox"
                    checked={same}
                    onChange={(event) => setSame(event.target.checked)}
                  />
                  Igual à carteira principal
                </label>
                <button
                  disabled={same}
                  onClick={() => setNewSecondary(!newSecondary)}
                >
                  Adicionar
                </button>
              </div>
            </header>
            {!secondary && !newSecondary && (
              <p>Você ainda não adicionou uma carteira secundária.</p>
            )}
            {(secondary || newSecondary) && !same && (
              <WalletEditor
                key={newSecondary ? 'new-secondary' : secondary?.id}
                wallet={newSecondary ? undefined : secondary}
                primary={false}
                onSaved={() => {
                  setNewSecondary(false)
                  setSaved('secondary')
                }}
              />
            )}
            {saved === 'secondary' && <p role="status">Carteira salva.</p>}
            {same && primary && <p>{primary.address}</p>}
          </section>
        </div>
      )}
    </AccountLayout>
  )
}
function WalletEditor({
  wallet,
  primary,
  onSaved,
}: {
  wallet?: Wallet
  primary: boolean
  onSaved: () => void
}) {
  const identity = useIdentity()
  const { user } = useSession()
  const cache = useQueryClient()
  const [form, setForm] = useState<WalletFormValues>(() =>
    wallet
      ? {
          displayName: wallet.displayName || user?.name || '',
          name: wallet.name,
          network: wallet.network,
          address: wallet.address,
          provider: wallet.provider || 'metamask',
          email: wallet.email || user?.email || '',
          profileName: wallet.profileName || user?.username || '',
          secondary: wallet.secondary || '',
          referralCode: wallet.referralCode || 'KURIO',
          ens: wallet.ens || user?.ens || '',
        }
      : { ...blankWallet },
  )
  const save = useMutation({
    mutationFn: () =>
      accountApi.saveWallet(
        {
          ...form,
          network: form.network as Network,
          provider: form.provider as Wallet['provider'],
          primary,
        },
        wallet?.id,
      ),
    onSuccess: (data) => {
      if (getIdentity().token !== identity.token) return
      cache.setQueryData(privateKeys.resource(identity.userId, 'wallets'), data)
      onSaved()
    },
  })
  return (
    <form
      noValidate
      aria-label={primary ? 'Carteira principal' : 'Carteira secundária'}
      onSubmit={(event) => {
        event.preventDefault()
        if (!save.isPending) save.mutate()
      }}
    >
      <WalletFields
        prefix={primary ? 'primary' : 'secondary'}
        form={form}
        errors={fieldErrors(save.error)}
        change={(name, value) => {
          setForm((previous) => ({ ...previous, [name]: value }))
          save.reset()
        }}
      />
      {save.isError && (
        <p className="form-error" role="alert">
          {errorMessage(save.error)}
        </p>
      )}
      <Button type="submit" disabled={save.isPending}>
        {save.isPending ? 'Salvando…' : 'Salvar carteira'}
      </Button>
    </form>
  )
}

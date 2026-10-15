import type { Network, Wallet } from '@/types/contracts'
import { FormField } from './form-field'
import { EnsField } from './ens-field'
import { networkLabels } from '@/features/catalog/search'
export interface WalletFormValues {
  displayName: string
  name: string
  network: Network | ''
  address: string
  provider: NonNullable<Wallet['provider']> | ''
  email: string
  profileName: string
  secondary: string
  referralCode: string
  ens: string
}
export const blankWallet: WalletFormValues = {
  displayName: '',
  name: '',
  network: '',
  address: '',
  provider: '',
  email: '',
  profileName: '',
  secondary: '',
  referralCode: '',
  ens: '',
}
export function WalletFields({
  form,
  errors,
  change,
  checkout = false,
  prefix = 'wallet',
}: {
  form: WalletFormValues
  errors: Record<string, string>
  change: (name: keyof WalletFormValues, value: string) => void
  checkout?: boolean
  prefix?: string
}) {
  const field = (name: keyof WalletFormValues, label: string, extra = {}) => (
    <FormField
      key={name}
      required
      label={label}
      name={`${prefix}-${name}`}
      value={form[name]}
      error={errors[name]}
      onChange={(event) => change(name, event.target.value)}
      {...extra}
    />
  )
  return (
    <div className="wallet-field-grid">
      <div className="wallet-column">
        {field('displayName', 'Nome de exibição')}
        <div className="form-field">
          <div className="field-label">
            <label htmlFor={`${prefix}-network`}>Rede</label>
            <span className="required-mark" aria-hidden="true">
              *
            </span>
          </div>
          <select
            id={`${prefix}-network`}
            className="control"
            required
            value={form.network}
            aria-invalid={!!errors.network}
            aria-describedby={
              errors.network ? `${prefix}-network-error` : undefined
            }
            onChange={(event) => change('network', event.target.value)}
          >
            <option value="">Selecione uma rede</option>
            {Object.entries(networkLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {errors.network && (
            <span id={`${prefix}-network-error`} className="form-error">
              {errors.network}
            </span>
          )}
        </div>
        {field('address', 'Endereço da carteira', {
          placeholder: 'Endereço 0x da carteira',
        })}
        <div className="form-field">
          <div className="field-label">
            <label htmlFor={`${prefix}-provider`}>Tipo de carteira</label>
            <span className="required-mark" aria-hidden="true">
              *
            </span>
          </div>
          <select
            id={`${prefix}-provider`}
            className="control"
            required
            value={form.provider}
            aria-invalid={!!errors.provider}
            aria-describedby={
              errors.provider ? `${prefix}-provider-error` : undefined
            }
            onChange={(event) => change('provider', event.target.value)}
          >
            <option value="">Selecione uma carteira</option>
            <option value="metamask">MetaMask</option>
            <option value="walletconnect">WalletConnect</option>
            <option value="coinbase">Coinbase Wallet</option>
          </select>
          {errors.provider && (
            <span id={`${prefix}-provider-error`} className="form-error">
              {errors.provider}
            </span>
          )}
        </div>
        {field('email', 'E-mail', { type: 'email' })}
      </div>
      <div className="wallet-column">
        {field('name', checkout ? 'Nome de usuário' : 'Apelido da carteira')}
        {field('profileName', 'Nome do perfil')}
        <FormField
          hideLabel
          label="ENS ou carteira secundária (opcional)"
          name={`${prefix}-secondary`}
          placeholder="ENS ou carteira secundária (opcional)"
          value={form.secondary}
          error={errors.secondary}
          onChange={(event) => change('secondary', event.target.value)}
        />
        {field('referralCode', 'Código de indicação')}
        <EnsField
          name={`${prefix}-ens`}
          value={form.ens}
          error={errors.ens}
          onChange={(value) => change('ens', value)}
        />
      </div>
    </div>
  )
}

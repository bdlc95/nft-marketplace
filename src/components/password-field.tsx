import { useState, type InputHTMLAttributes } from 'react'
import { FormField } from './form-field'
export function PasswordField({
  tone = 'auth',
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string
  hideLabel?: boolean
  tone?: 'auth' | 'profile'
}) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="password-field">
      <FormField {...props} type={visible ? 'text' : 'password'} />
      <button
        type="button"
        className={`password-visibility ${props.hideLabel ? 'no-visible-label' : ''}`}
        aria-label={
          visible
            ? `Ocultar ${props.label.toLowerCase()}`
            : `Mostrar ${props.label.toLowerCase()}`
        }
        aria-pressed={visible}
        onClick={() => setVisible(!visible)}
      >
        <img
          className="desktop-only"
          src={`/assets/pdf/eye-${tone === 'profile' ? 'profile' : 'desktop'}.png`}
          width="20"
          height="17"
          alt=""
        />
        <img
          className="mobile-only"
          src={`/assets/pdf/eye-${tone === 'profile' ? 'profile' : 'mobile'}.png`}
          width="17"
          height="14"
          alt=""
        />
      </button>
    </div>
  )
}

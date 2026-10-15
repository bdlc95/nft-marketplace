import type { InputHTMLAttributes } from 'react'
import { Input } from '@/components/ui/input'
export function FormField({
  label,
  error,
  hideLabel = false,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string
  hideLabel?: boolean
}) {
  const id = props.id || props.name || label.toLowerCase().replace(/\W/g, '-')
  return (
    <div className="form-field">
      <div className={hideLabel ? 'sr-only' : 'field-label'}>
        <label htmlFor={id}>{label}</label>
        {props.required && (
          <span className="required-mark" aria-hidden="true">
            *
          </span>
        )}
      </div>
      <Input
        {...props}
        id={id}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && (
        <span id={`${id}-error`} className="form-error">
          {error}
        </span>
      )}
    </div>
  )
}

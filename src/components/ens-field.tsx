import { Input } from '@/components/ui/input'
export function EnsField({
  name = 'ens',
  value,
  error,
  onChange,
}: {
  name?: string
  value: string
  error?: string
  onChange: (value: string) => void
}) {
  return (
    <div className="form-field ens-field">
      <div className="field-label">
        <label htmlFor={name}>Nome ENS</label>
        <span className="required-mark" aria-hidden="true">
          *
        </span>
      </div>
      <div className="ens-input">
        <select className="control" aria-label="Sufixo ENS" defaultValue=".eth">
          <option>.eth</option>
        </select>
        <Input
          id={name}
          name={name}
          value={value}
          required
          aria-invalid={!!error}
          aria-describedby={error ? `${name}-error` : undefined}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
      {error && (
        <span id={`${name}-error`} className="form-error">
          {error}
        </span>
      )}
    </div>
  )
}

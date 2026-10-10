import { useId, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

const CONTROL_BASE =
  'rounded-lg border border-[var(--aw-border)] bg-[var(--aw-surface)] px-2.5 py-1.5 text-sm text-[var(--aw-text)] placeholder:text-[var(--aw-muted)]/70 transition focus:border-[var(--aw-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--aw-primary)]/20 disabled:opacity-60'
const CONTROL = `w-full ${CONTROL_BASE}`

/** A labelled control. The child receives the generated id, so the label is always wired up. */
export function Field({ label, hint, required, className = '', children }) {
  const id = useId()
  return (
    <div className={`flex min-w-0 flex-col gap-1 ${className}`}>
      <label htmlFor={id} className="text-xs font-medium text-[var(--aw-text)]">
        {label}
        {required ? <span className="ml-0.5 text-[var(--aw-danger)]">*</span> : null}
      </label>
      {children(id)}
      {hint ? <p className="text-[11px] leading-snug text-[var(--aw-muted)]">{hint}</p> : null}
    </div>
  )
}

export function TextInput({ label, hint, required, className, value, onChange, ...rest }) {
  return (
    <Field label={label} hint={hint} required={required} className={className}>
      {(id) => (
        <input
          id={id}
          className={CONTROL}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          {...rest}
        />
      )}
    </Field>
  )
}

export function TextArea({ label, hint, required, className, value, onChange, rows = 3, ...rest }) {
  return (
    <Field label={label} hint={hint} required={required} className={className}>
      {(id) => (
        <textarea
          id={id}
          rows={rows}
          className={`${CONTROL} resize-y`}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          {...rest}
        />
      )}
    </Field>
  )
}

/**
 * @param {{ options: Array<{ value: string, label: string, disabled?: boolean }> | string[] }} props
 */
export function SelectInput({ label, hint, required, className, value, onChange, options, placeholder, ...rest }) {
  const normalized = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o))
  return (
    <Field label={label} hint={hint} required={required} className={className}>
      {(id) => (
        <select
          id={id}
          className={CONTROL}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          {...rest}
        >
          {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
          {normalized.map((o) => (
            <option key={o.value} value={o.value} disabled={o.disabled}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  )
}

export function Checkbox({ label, hint, checked, onChange, className = '' }) {
  const id = useId()
  return (
    <div className={`flex items-start gap-2 ${className}`}>
      <input
        id={id}
        type="checkbox"
        checked={Boolean(checked)}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-4 accent-[var(--aw-primary)]"
      />
      <div>
        <label htmlFor={id} className="text-sm text-[var(--aw-text)]">
          {label}
        </label>
        {hint ? <p className="text-[11px] text-[var(--aw-muted)]">{hint}</p> : null}
      </div>
    </div>
  )
}

/** A bare search box for table toolbars. */
export function SearchInput({ value, onChange, placeholder = 'Search', className = '' }) {
  return (
    <input
      type="search"
      className={`${CONTROL} ${className}`}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      aria-label={placeholder}
    />
  )
}

/** A bare select for table toolbars. */
export function FilterSelect({ value, onChange, options, label }) {
  return (
    <select
      className={`${CONTROL_BASE} w-auto`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

/** A password input with a show/hide toggle. Never pre-filled from anything the app stores. */
export function PasswordInput({ label, hint, required, className, value, onChange, autoComplete = 'current-password', ...rest }) {
  const [visible, setVisible] = useState(false)
  return (
    <Field label={label} hint={hint} required={required} className={className}>
      {(id) => (
        <div className="relative">
          <input
            id={id}
            type={visible ? 'text' : 'password'}
            className={`${CONTROL} pr-9`}
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            required={required}
            autoComplete={autoComplete}
            spellCheck={false}
            {...rest}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-[var(--aw-muted)] hover:text-[var(--aw-text)]"
            aria-label={visible ? 'Hide password' : 'Show password'}
            tabIndex={-1}
          >
            {visible ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
          </button>
        </div>
      )}
    </Field>
  )
}

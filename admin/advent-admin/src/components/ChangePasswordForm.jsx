import { useState } from 'react'
import { KeyRound } from 'lucide-react'
import { changeMyPassword } from '../api'
import { useAction } from '../hooks/useAction'
import { MIN_PASSWORD_LENGTH } from '../lib/roles'
import { useAuthStore } from '../store/useAuthStore'
import { Button } from './Button'
import { PasswordInput } from './Field'
import { InlineError } from './Notice'

/**
 * Replaces the signed-in admin's password. The gateway checks the current one and the rules,
 * ends every other session, and returns a new one, which this adopts.
 */
export function ChangePasswordForm({ onChanged }) {
  const applySession = useAuthStore((s) => s.applySession)
  const email = useAuthStore((s) => s.account?.email)
  const [form, setForm] = useState({ current: '', next: '', confirm: '' })
  const [problem, setProblem] = useState(null)
  const action = useAction()
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }))

  const submit = async (e) => {
    e.preventDefault()
    const issue =
      [...form.next].length < MIN_PASSWORD_LENGTH
        ? `Use at least ${MIN_PASSWORD_LENGTH} characters.`
        : form.next !== form.confirm
          ? 'The two new passwords do not match.'
          : form.next === form.current
            ? 'The new password must differ from the current one.'
            : null
    setProblem(issue)
    if (issue) return
    const ok = await action.run(async () => {
      applySession(await changeMyPassword(form.current, form.next))
    })
    if (ok) {
      setForm({ current: '', next: '', confirm: '' })
      onChanged?.()
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      {/* Lets password managers file the new password under the right account. */}
      <input type="email" autoComplete="username" value={email ?? ''} readOnly hidden />
      <PasswordInput label="Current password" value={form.current} onChange={set('current')} required />
      <PasswordInput
        label="New password"
        autoComplete="new-password"
        hint={`At least ${MIN_PASSWORD_LENGTH} characters. A few unrelated words make a strong one.`}
        value={form.next}
        onChange={set('next')}
        required
      />
      <PasswordInput
        label="Repeat the new password"
        autoComplete="new-password"
        value={form.confirm}
        onChange={set('confirm')}
        required
      />
      {problem ? <p className="text-xs text-[var(--aw-danger)]">{problem}</p> : null}
      <InlineError error={action.error} />
      <Button type="submit" variant="primary" icon={KeyRound} pending={action.pending}>
        Change password
      </Button>
    </form>
  )
}

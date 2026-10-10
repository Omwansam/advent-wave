import { useCallback, useState } from 'react'
import { Copy, KeyRound, Pencil, Plus, RefreshCw } from 'lucide-react'
import { createAccount, listAccounts, resetAccountPassword, updateAccount } from '../api'
import { Button } from '../components/Button'
import { Card, TableWrap } from '../components/Card'
import { Chip } from '../components/Chip'
import { Checkbox, SelectInput, TextInput } from '../components/Field'
import { Modal } from '../components/Modal'
import { InlineError, Notice } from '../components/Notice'
import { PageHeader } from '../components/PageHeader'
import { AsyncBody } from '../components/PageState'
import { useAction } from '../hooks/useAction'
import { useAsync } from '../hooks/useAsync'
import { formatDateTime, formatRelative } from '../lib/format'
import { generateTemporaryPassword, MIN_PASSWORD_LENGTH, ROLES, roleLabel } from '../lib/roles'
import { useAuthStore } from '../store/useAuthStore'

const ROLE_OPTIONS = ROLES.map((r) => ({ value: r.value, label: `${r.label} — ${r.description}` }))

export function Accounts() {
  const me = useAuthStore((s) => s.account)
  const load = useCallback((signal) => listAccounts({ signal }), [])
  const accounts = useAsync(load)
  const [dialog, setDialog] = useState(null)

  const replace = (next) => accounts.mutate((list) => list.map((a) => (a.id === next.id ? next : a)))

  return (
    <>
      <PageHeader
        title="Admin accounts"
        description="Who can sign in to this portal, and what each role may do. The gateway checks the stored role on every request, so a change here takes effect at once and ends that person's sessions."
        actions={
          <Button variant="primary" icon={Plus} onClick={() => setDialog({ kind: 'create' })}>
            New account
          </Button>
        }
      />

      <Card>
        <AsyncBody state={accounts} isEmpty={(list) => !list.length} empty="No accounts.">
          {(list) => (
            <TableWrap>
              <table className="aw-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Last sign-in</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {list.map((a) => (
                    <tr key={a.id}>
                      <td className="font-medium">
                        {a.displayName}
                        {a.id === me?.id ? <span className="ml-2 text-xs text-[var(--aw-muted)]">(you)</span> : null}
                      </td>
                      <td className="text-[var(--aw-muted)]">{a.email}</td>
                      <td>
                        <Chip tone="primary">{roleLabel(a.role)}</Chip>
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {a.active ? <Chip tone="ok">active</Chip> : <Chip tone="danger">disabled</Chip>}
                          {a.lockedUntil ? (
                            <Chip tone="warn" title={`Locked until ${formatDateTime(a.lockedUntil)}`}>locked</Chip>
                          ) : null}
                          {a.mustChangePassword ? <Chip tone="info">temporary password</Chip> : null}
                        </div>
                      </td>
                      <td className="whitespace-nowrap text-[var(--aw-muted)]" title={a.lastLoginAt}>
                        {a.lastLoginAt ? formatRelative(a.lastLoginAt) : 'never'}
                      </td>
                      <td className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setDialog({ kind: 'edit', account: a })}>
                            Edit
                          </Button>
                          <Button size="sm" variant="ghost" icon={KeyRound} onClick={() => setDialog({ kind: 'reset', account: a })}>
                            Reset password
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}
        </AsyncBody>
      </Card>

      {dialog?.kind === 'create' ? (
        <CreateAccount
          onClose={() => setDialog(null)}
          onCreated={() => {
            accounts.reload()
          }}
        />
      ) : null}
      {dialog?.kind === 'edit' ? (
        <EditAccount
          key={dialog.account.id}
          account={dialog.account}
          isSelf={dialog.account.id === me?.id}
          onClose={() => setDialog(null)}
          onSaved={(next) => {
            replace(next)
            setDialog(null)
          }}
        />
      ) : null}
      {dialog?.kind === 'reset' ? (
        <ResetPassword
          key={dialog.account.id}
          account={dialog.account}
          onClose={() => setDialog(null)}
          onReset={replace}
        />
      ) : null}
    </>
  )
}

/** The temporary password, shown once with a copy button; the server never shows it again. */
function TemporaryPasswordField({ value, onChange, readOnly = false }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="space-y-1">
      <div className="flex items-end gap-2">
        <TextInput
          className="flex-1"
          label="Temporary password"
          required
          value={value}
          onChange={onChange}
          readOnly={readOnly}
          autoComplete="off"
          spellCheck={false}
          hint={`At least ${MIN_PASSWORD_LENGTH} characters. They must replace it when they first sign in.`}
        />
        {!readOnly ? (
          <Button className="mb-5" icon={RefreshCw} onClick={() => onChange(generateTemporaryPassword())} title="Generate">
            Generate
          </Button>
        ) : null}
        <Button
          className="mb-5"
          icon={Copy}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value)
              setCopied(true)
            } catch {
              setCopied(false)
            }
          }}
        >
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
    </div>
  )
}

function CreateAccount({ onClose, onCreated }) {
  const [form, setForm] = useState({
    displayName: '',
    email: '',
    role: 'viewer',
    temporaryPassword: generateTemporaryPassword(),
  })
  const [created, setCreated] = useState(null)
  const action = useAction()
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }))

  const submit = (e) => {
    e.preventDefault()
    action.run(async () => {
      const account = await createAccount({ ...form, email: form.email.trim(), displayName: form.displayName.trim() })
      setCreated(account)
      onCreated(account)
    })
  }

  if (created) {
    return (
      <Modal title="Account created" onClose={onClose} footer={<Button variant="primary" onClick={onClose}>Done</Button>}>
        <div className="space-y-3">
          <Notice tone="ok">
            {created.displayName} ({created.email}) can now sign in as {roleLabel(created.role)}. Give them this temporary
            password over a channel you trust; it is not shown again.
          </Notice>
          <TemporaryPasswordField value={form.temporaryPassword} readOnly />
        </div>
      </Modal>
    )
  }

  return (
    <Modal title="New admin account" onClose={onClose} width="max-w-xl">
      <form onSubmit={submit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <TextInput label="Name" required value={form.displayName} onChange={set('displayName')} autoFocus />
        <TextInput label="Email" type="email" required autoComplete="off" value={form.email} onChange={set('email')} />
        <SelectInput className="sm:col-span-2" label="Role" required value={form.role} onChange={set('role')} options={ROLE_OPTIONS} />
        <div className="sm:col-span-2">
          <TemporaryPasswordField value={form.temporaryPassword} onChange={set('temporaryPassword')} />
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 sm:col-span-2">
          <InlineError error={action.error} className="mr-auto" />
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" pending={action.pending}>
            Create account
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function EditAccount({ account, isSelf, onClose, onSaved }) {
  const [form, setForm] = useState({ displayName: account.displayName, role: account.role, active: account.active })
  const action = useAction()
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }))

  const submit = (e) => {
    e.preventDefault()
    const patch = {}
    if (form.displayName.trim() !== account.displayName) patch.displayName = form.displayName.trim()
    if (form.role !== account.role) patch.role = form.role
    if (form.active !== account.active) patch.active = form.active
    if (!Object.keys(patch).length) {
      onClose()
      return
    }
    action.run(async () => onSaved(await updateAccount(account.id, patch)))
  }

  const sessionsEnd = form.role !== account.role || form.active !== account.active

  return (
    <Modal title={`Edit ${account.displayName}`} description={account.email} onClose={onClose} width="max-w-xl">
      <form onSubmit={submit} className="space-y-3">
        <TextInput label="Name" required value={form.displayName} onChange={set('displayName')} />
        <SelectInput
          label="Role"
          value={form.role}
          onChange={set('role')}
          options={ROLE_OPTIONS}
          disabled={isSelf}
          hint={isSelf ? 'You cannot change your own role; another super admin can.' : undefined}
        />
        <Checkbox
          label="Active"
          hint={isSelf ? 'You cannot disable your own account.' : 'A disabled account cannot sign in, and its sessions end.'}
          checked={form.active}
          onChange={(v) => !isSelf && set('active')(v)}
        />
        {sessionsEnd ? <Notice tone="warn">Saving ends this person&apos;s current sessions; they sign in again.</Notice> : null}
        <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
          <InlineError error={action.error} className="mr-auto" />
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" pending={action.pending}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function ResetPassword({ account, onClose, onReset }) {
  const [password, setPassword] = useState(generateTemporaryPassword())
  const [done, setDone] = useState(false)
  const action = useAction()

  const submit = (e) => {
    e.preventDefault()
    action.run(async () => {
      onReset(await resetAccountPassword(account.id, password))
      setDone(true)
    })
  }

  return (
    <Modal title={`Reset ${account.displayName}'s password`} description={account.email} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        {done ? (
          <Notice tone="ok">
            Done. Their sessions have ended, the account is unlocked, and they must choose a new password when they
            sign in with this one. It is not shown again.
          </Notice>
        ) : (
          <Notice tone="warn">This ends their current sessions and unlocks the account.</Notice>
        )}
        <TemporaryPasswordField value={password} onChange={setPassword} readOnly={done} />
        <div className="flex flex-wrap items-center justify-end gap-2">
          <InlineError error={action.error} className="mr-auto" />
          {done ? (
            <Button variant="primary" onClick={onClose}>
              Done
            </Button>
          ) : (
            <>
              <Button onClick={onClose}>Cancel</Button>
              <Button type="submit" variant="primary" pending={action.pending}>
                Reset password
              </Button>
            </>
          )}
        </div>
      </form>
    </Modal>
  )
}

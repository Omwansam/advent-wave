import { useState } from 'react'
import { createLicense } from '../../api'
import { useAction } from '../../hooks/useAction'
import { endOfDayInstant } from '../../lib/format'
import { blankToNull } from '../../lib/forms'
import { Button } from '../Button'
import { TextInput } from '../Field'
import { Modal } from '../Modal'
import { InlineError } from '../Notice'

/**
 * A new licence for a church. It starts pending; granting it (on the church page) is what
 * lets items that point at it publish. Licences are never edited, only moved through status.
 */
export function LicenseForm({ churchId, onClose, onSaved }) {
  const [form, setForm] = useState({
    territory: '',
    expiresAt: '',
    revenueSharePct: '',
    consentDocumentUrl: '',
  })
  const action = useAction()
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }))

  const submit = (e) => {
    e.preventDefault()
    action.run(async () => {
      const saved = await createLicense({
        churchId,
        territory: blankToNull(form.territory),
        expiresAt: endOfDayInstant(form.expiresAt) ?? null,
        revenueSharePct: form.revenueSharePct === '' ? null : Number(form.revenueSharePct),
        consentDocumentUrl: blankToNull(form.consentDocumentUrl),
      })
      onSaved(saved)
    })
  }

  return (
    <Modal
      title="New licence"
      description="Created as pending. Grant it once the signed consent is on file."
      onClose={onClose}
    >
      <form onSubmit={submit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <TextInput
          label="Territory"
          placeholder="worldwide"
          hint="Where the recordings may be streamed."
          value={form.territory}
          onChange={set('territory')}
          autoFocus
        />
        <TextInput
          label="Expires"
          type="date"
          hint="Leave empty for no expiry. Ends at 23:59 UTC that day."
          value={form.expiresAt}
          onChange={set('expiresAt')}
        />
        <TextInput
          label="Revenue share %"
          type="number"
          min="0"
          max="100"
          step="0.01"
          placeholder="0"
          value={form.revenueSharePct}
          onChange={set('revenueSharePct')}
        />
        <TextInput
          label="Consent document URL"
          type="url"
          placeholder="https://…"
          value={form.consentDocumentUrl}
          onChange={set('consentDocumentUrl')}
        />
        <div className="flex flex-wrap items-center justify-end gap-2 pt-2 sm:col-span-2">
          <InlineError error={action.error} className="mr-auto" />
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" pending={action.pending}>
            Create licence
          </Button>
        </div>
      </form>
    </Modal>
  )
}

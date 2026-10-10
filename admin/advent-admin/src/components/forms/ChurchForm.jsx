import { useState } from 'react'
import { createChurch, updateChurch } from '../../api'
import { useAction } from '../../hooks/useAction'
import { cleanForm } from '../../lib/forms'
import { Button } from '../Button'
import { TextInput } from '../Field'
import { Modal } from '../Modal'
import { InlineError } from '../Notice'

/** Create (no `church`) or edit a church. Consent is changed separately, on the detail page. */
export function ChurchForm({ church, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: church?.name ?? '',
    country: church?.country ?? '',
    region: church?.region ?? '',
    contactEmail: church?.contactEmail ?? '',
  })
  const action = useAction()
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }))

  const submit = (e) => {
    e.preventDefault()
    action.run(async () => {
      const body = cleanForm(form)
      const saved = church ? await updateChurch(church.id, body) : await createChurch(body)
      onSaved(saved)
    })
  }

  return (
    <Modal
      title={church ? 'Edit church' : 'New church'}
      description="A contributing church. Its licences are what let its recordings publish."
      onClose={onClose}
    >
      <form onSubmit={submit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <TextInput className="sm:col-span-2" label="Name" required value={form.name} onChange={set('name')} autoFocus />
        <TextInput label="Country" placeholder="Kenya" value={form.country} onChange={set('country')} />
        <TextInput label="Region" placeholder="East Africa" value={form.region} onChange={set('region')} />
        <TextInput
          className="sm:col-span-2"
          label="Contact email"
          type="email"
          value={form.contactEmail}
          onChange={set('contactEmail')}
        />
        <div className="flex flex-wrap items-center justify-end gap-2 pt-2 sm:col-span-2">
          <InlineError error={action.error} className="mr-auto" />
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" pending={action.pending}>
            {church ? 'Save' : 'Create church'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

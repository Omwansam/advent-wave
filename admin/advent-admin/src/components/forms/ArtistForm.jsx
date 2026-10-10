import { useState } from 'react'
import { createArtist, updateArtist } from '../../api'
import { useAction } from '../../hooks/useAction'
import { blankToNull, slugify } from '../../lib/forms'
import { useCatalogStore } from '../../store/useCatalogStore'
import { Button } from '../Button'
import { Checkbox, SelectInput, TextArea, TextInput } from '../Field'
import { Modal } from '../Modal'
import { InlineError } from '../Notice'

/**
 * The artist fields, as a form body. Shared by the modal and the inline "new artist" panel
 * in Add media. PUT /artists/{id} replaces every field, so this always sends all of them.
 */
export function ArtistFields({ artist, defaultChurchId, compact = false, onCancel, onSaved, submitLabel }) {
  const churches = useCatalogStore((s) => s.churches)
  const refreshCatalog = useCatalogStore((s) => s.refresh)
  const [form, setForm] = useState({
    name: artist?.name ?? '',
    slug: artist?.slug ?? '',
    coverUrl: artist?.coverUrl ?? '',
    bio: artist?.bio ?? '',
    churchId: artist?.churchId ?? defaultChurchId ?? '',
    verified: artist?.verified ?? false,
  })
  const action = useAction()
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }))

  const submit = (e) => {
    e.preventDefault()
    e.stopPropagation()
    action.run(async () => {
      const body = {
        name: form.name.trim(),
        slug: blankToNull(form.slug),
        coverUrl: blankToNull(form.coverUrl),
        bio: blankToNull(form.bio),
        churchId: form.churchId || null,
        verified: form.verified,
      }
      const saved = artist ? await updateArtist(artist.id, body) : await createArtist(body)
      await refreshCatalog()
      onSaved(saved)
    })
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <TextInput label="Name" required value={form.name} onChange={set('name')} autoFocus />
      <TextInput
        label="Slug"
        placeholder={slugify(form.name) || 'generated from the name'}
        hint="Leave empty to let the server choose."
        value={form.slug}
        onChange={set('slug')}
      />
      <SelectInput
        className={compact ? 'sm:col-span-2' : ''}
        label="Church"
        hint="Its licences are the ones this artist's recordings can use."
        value={form.churchId}
        onChange={set('churchId')}
        placeholder="No church"
        options={churches.map((c) => ({ value: c.id, label: c.name }))}
      />
      {!compact ? (
        <TextInput label="Cover URL" type="url" placeholder="https://…" value={form.coverUrl} onChange={set('coverUrl')} />
      ) : null}
      {!compact ? (
        <TextArea className="sm:col-span-2" label="Bio" value={form.bio} onChange={set('bio')} />
      ) : null}
      <Checkbox
        className="sm:col-span-2"
        label="Verified"
        hint="Shown to listeners as an official artist profile."
        checked={form.verified}
        onChange={set('verified')}
      />
      <div className="flex flex-wrap items-center justify-end gap-2 pt-1 sm:col-span-2">
        <InlineError error={action.error} className="mr-auto" />
        {onCancel ? <Button onClick={onCancel}>Cancel</Button> : null}
        <Button type="submit" variant="primary" pending={action.pending}>
          {submitLabel ?? (artist ? 'Save' : 'Create artist')}
        </Button>
      </div>
    </form>
  )
}

export function ArtistForm({ artist, defaultChurchId, onClose, onSaved }) {
  return (
    <Modal title={artist ? 'Edit artist' : 'New artist'} onClose={onClose} width="max-w-xl">
      <ArtistFields artist={artist} defaultChurchId={defaultChurchId} onCancel={onClose} onSaved={onSaved} />
    </Modal>
  )
}

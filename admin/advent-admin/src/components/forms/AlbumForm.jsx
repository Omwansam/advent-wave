import { useState } from 'react'
import { createAlbum, updateAlbum } from '../../api'
import { useAction } from '../../hooks/useAction'
import { blankToNull, toDateInput } from '../../lib/forms'
import { Button } from '../Button'
import { TextInput } from '../Field'
import { Modal } from '../Modal'
import { InlineError } from '../Notice'

/** Create an album under `artistId`, or edit `album` (PATCH: only what is sent changes). */
export function AlbumForm({ album, artistId, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: album?.title ?? '',
    coverUrl: album?.coverUrl ?? '',
    releaseDate: toDateInput(album?.releaseDate),
  })
  const action = useAction()
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }))

  const submit = (e) => {
    e.preventDefault()
    action.run(async () => {
      const body = {
        title: form.title.trim(),
        coverUrl: blankToNull(form.coverUrl),
        releaseDate: blankToNull(form.releaseDate),
      }
      const saved = album ? await updateAlbum(album.id, body) : await createAlbum({ ...body, artistId })
      onSaved(saved)
    })
  }

  return (
    <Modal title={album ? 'Edit album' : 'New album'} onClose={onClose}>
      <form onSubmit={submit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <TextInput className="sm:col-span-2" label="Title" required value={form.title} onChange={set('title')} autoFocus />
        <TextInput label="Cover URL" type="url" placeholder="https://…" value={form.coverUrl} onChange={set('coverUrl')} />
        <TextInput label="Release date" type="date" value={form.releaseDate} onChange={set('releaseDate')} />
        <div className="flex flex-wrap items-center justify-end gap-2 pt-2 sm:col-span-2">
          <InlineError error={action.error} className="mr-auto" />
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" pending={action.pending}>
            {album ? 'Save' : 'Create album'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

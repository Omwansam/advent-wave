import { useState } from 'react'
import { createArtist, updateArtist } from '../../api'
import { useAction } from '../../hooks/useAction'
import { blankToNull, slugify } from '../../lib/forms'
import { useCatalogStore } from '../../store/useCatalogStore'
import { Button } from '../Button'
import { Checkbox, SelectInput, TextArea, TextInput } from '../Field'
import { Modal } from '../Modal'
import { InlineError } from '../Notice'

const KINDS = [
  { value: 'church', label: 'Church — a congregation’s own profile' },
  { value: 'choir', label: 'Choir' },
  { value: 'group', label: 'Group — ministry group, band, quartet' },
  { value: 'soloist', label: 'Singer or musician' },
  { value: 'preacher', label: 'Preacher or speaker' },
  { value: 'ministry', label: 'Ministry — radio, media, department' },
]

const ENSEMBLES = [
  { value: 'main', label: 'Main choir' },
  { value: 'youth', label: 'Youth choir' },
  { value: 'children', label: 'Children’s choir' },
  { value: 'women', label: 'Women’s choir' },
  { value: 'men', label: 'Men’s choir' },
  { value: 'other', label: 'Other' },
]

/**
 * The artist fields, as a form body. Shared by the modal and the inline "new artist" panel
 * in Add media. PUT /artists/{id} replaces every field, so this always sends all of them.
 * Kind, ensemble, home church, conference and location are RFC 0009: what listeners see the
 * profile as, and where it sits.
 */
export function ArtistFields({ artist, defaultChurchId, compact = false, onCancel, onSaved, submitLabel }) {
  const churches = useCatalogStore((s) => s.churches)
  const artists = useCatalogStore((s) => s.artists)
  const conferences = useCatalogStore((s) => s.conferences)
  const refreshCatalog = useCatalogStore((s) => s.refresh)
  const [form, setForm] = useState({
    name: artist?.name ?? '',
    slug: artist?.slug ?? '',
    coverUrl: artist?.coverUrl ?? '',
    bio: artist?.bio ?? '',
    churchId: artist?.churchId ?? defaultChurchId ?? '',
    verified: artist?.verified ?? false,
    kind: artist?.kind ?? 'choir',
    ensemble: artist?.ensemble ?? 'main',
    homeChurchId: artist?.homeChurchId ?? '',
    conferenceId: artist?.conferenceId ?? '',
    location: artist?.location ?? '',
  })
  const isChoir = form.kind === 'choir'
  const isChurch = form.kind === 'church'
  const churchProfiles = artists.filter((a) => a.kind === 'church' && a.id !== artist?.id)
  const conferenceOptions = conferences
    .filter((c) => c.kind !== 'division')
    .map((c) => ({ value: c.id, label: c.kind === 'union' ? `${c.name} (whole union)` : `${c.name} — ${c.kind}` }))
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
        kind: form.kind,
        ensemble: isChoir ? form.ensemble : null,
        homeChurchId: isChurch ? null : form.homeChurchId || null,
        conferenceId: form.conferenceId || null,
        location: blankToNull(form.location),
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
      <SelectInput label="Kind" hint="What listeners see this profile as." value={form.kind} onChange={set('kind')} options={KINDS} />
      {isChoir ? (
        <SelectInput label="Ensemble" value={form.ensemble} onChange={set('ensemble')} options={ENSEMBLES} />
      ) : null}
      {!isChurch ? (
        <SelectInput
          label="Home church"
          hint="The church profile this belongs to. None: an independent choir, group or singer."
          value={form.homeChurchId}
          onChange={set('homeChurchId')}
          placeholder="None — independent"
          options={churchProfiles.map((c) => ({ value: c.id, label: c.name }))}
        />
      ) : null}
      <SelectInput
        label="Conference"
        hint={isChurch ? 'Where this church sits.' : 'Leave empty to use the home church’s.'}
        value={form.conferenceId}
        onChange={set('conferenceId')}
        placeholder="Not set"
        options={conferenceOptions}
      />
      <TextInput label="Location" placeholder="Town or area, e.g. Kisii" value={form.location} onChange={set('location')} />
      <SelectInput
        className={compact ? 'sm:col-span-2' : ''}
        label="Rights holder"
        hint="The contributing church whose licences this artist's recordings use."
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

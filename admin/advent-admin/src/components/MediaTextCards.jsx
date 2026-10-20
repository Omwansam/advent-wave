import { useCallback, useMemo, useState } from 'react'
import { ListOrdered, MicVocal, Pencil, Trash2 } from 'lucide-react'
import {
  deleteMediaLyrics,
  getMediaChapters,
  getMediaLyrics,
  saveMediaChapters,
  saveMediaLyrics,
} from '../api'
import { Button } from './Button'
import { Card, CardHeader, DefinitionList } from './Card'
import { Chip } from './Chip'
import { SelectInput, TextArea, TextInput } from './Field'
import { InlineError } from './Notice'
import { Empty, LoadError, Loading } from './PageState'
import { useAction } from '../hooks/useAction'
import { useAsync } from '../hooks/useAsync'
import { formatDateTime } from '../lib/format'
import {
  RIGHTS_BASIS_LABEL,
  RIGHTS_BASIS_OPTIONS,
  chaptersToText,
  formatTimestamp,
  lyricsToText,
  parseChaptersText,
  parseLyricsText,
} from '../lib/mediaText'

/* ------------------------------------------------------------------ lyrics */

/**
 * A song's words (RFC 0004). They must match the recording, which is why nothing is seeded and
 * an editor enters them here; and they carry their own rights, separate from the licence on the
 * recording, which is why the basis and the credit are required.
 */
export function LyricsCard({ item, canEdit }) {
  const load = useCallback(
    (signal) =>
      getMediaLyrics(item.id, { signal }).catch((error) => {
        if (error?.isNotFound) return null
        throw error
      }),
    [item.id],
  )
  const lyrics = useAsync(load)
  const [editing, setEditing] = useState(false)
  const remove = useAction()

  if (lyrics.loading) {
    return (
      <Card>
        <CardHeader title="Lyrics" />
        <Loading />
      </Card>
    )
  }
  if (lyrics.error) {
    return (
      <Card>
        <CardHeader title="Lyrics" />
        <LoadError error={lyrics.error} onRetry={lyrics.reload} />
      </Card>
    )
  }

  const data = lyrics.data
  if (editing) {
    return (
      <LyricsForm
        itemId={item.id}
        initial={data}
        onCancel={() => setEditing(false)}
        onSaved={(saved) => {
          lyrics.mutate(saved)
          setEditing(false)
        }}
      />
    )
  }

  return (
    <Card>
      <CardHeader
        title="Lyrics"
        description={
          data
            ? `${data.lines.filter((l) => l.text.trim()).length} lines · ${data.synced ? 'synced to the recording' : 'not synced'}`
            : 'None yet. Listeners see the words of songs that have them, and can search by a line.'
        }
        actions={
          canEdit ? (
            <>
              <Button size="sm" icon={data ? Pencil : MicVocal} onClick={() => setEditing(true)}>
                {data ? 'Edit' : 'Add lyrics'}
              </Button>
              {data ? (
                <Button
                  size="sm"
                  variant="danger"
                  icon={Trash2}
                  pending={remove.pending}
                  onClick={() => {
                    if (!window.confirm('Remove these lyrics? Listeners stop seeing them at once.')) return
                    remove.run(async () => {
                      await deleteMediaLyrics(item.id)
                      lyrics.mutate(null)
                    })
                  }}
                >
                  Remove
                </Button>
              ) : null}
            </>
          ) : null
        }
      />
      <InlineError error={remove.error} className="px-4 pb-2" />
      {data ? (
        <>
          <DefinitionList
            items={[
              ['Rights', <Chip key="rights" tone={data.rightsBasis === 'licensed' ? 'info' : 'ok'}>{RIGHTS_BASIS_LABEL[data.rightsBasis] ?? data.rightsBasis}</Chip>],
              ['Credit', data.credit],
              ['Language', data.language || 'Same as the recording'],
              ['Updated', formatDateTime(data.updatedAt)],
            ]}
          />
          <pre className="mx-4 mb-4 max-h-48 overflow-y-auto whitespace-pre-wrap rounded-lg bg-[var(--aw-surface-elevated)] p-3 font-sans text-sm text-[var(--aw-text)]">
            {lyricsToText(data)}
          </pre>
        </>
      ) : (
        <Empty className="py-4">No lyrics.</Empty>
      )}
    </Card>
  )
}

function LyricsForm({ itemId, initial, onCancel, onSaved }) {
  const [form, setForm] = useState(() => ({
    rightsBasis: initial?.rightsBasis ?? '',
    credit: initial?.credit ?? '',
    language: initial?.language ?? '',
    text: initial ? lyricsToText(initial) : '',
  }))
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }))
  const parsed = useMemo(() => parseLyricsText(form.text), [form.text])
  const save = useAction()

  const submit = (e) => {
    e.preventDefault()
    if (parsed.error) return
    save.run(async () => {
      onSaved(
        await saveMediaLyrics(itemId, {
          lines: parsed.lines,
          rightsBasis: form.rightsBasis,
          credit: form.credit.trim(),
          language: form.language.trim() || null,
        }),
      )
    })
  }

  return (
    <Card>
      <CardHeader
        title={initial ? 'Edit lyrics' : 'Add lyrics'}
        description="The words have their own rights, apart from the recording's licence: say on what basis they are shown."
      />
      <form onSubmit={submit} className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
        <SelectInput
          className="sm:col-span-2"
          label="Rights basis"
          required
          value={form.rightsBasis}
          onChange={set('rightsBasis')}
          placeholder="Choose…"
          options={RIGHTS_BASIS_OPTIONS}
        />
        <TextInput
          label="Credit"
          required
          value={form.credit}
          onChange={set('credit')}
          placeholder="Words: Fanny J. Crosby, 1873"
          hint="Shown to listeners under the lyrics."
        />
        <TextInput
          label="Language"
          value={form.language}
          onChange={set('language')}
          placeholder="en, sw…"
          hint="Of the words, when it differs from the recording's."
        />
        <TextArea
          className="sm:col-span-2"
          label="Words"
          required
          rows={14}
          value={form.text}
          onChange={set('text')}
          hint="One line per line, a blank line between verses. To sync, start every line with its time: [0:14.5] I once was lost, but now am found;"
        />
        <p className={`text-xs sm:col-span-2 ${parsed.error && form.text.trim() ? 'text-[var(--aw-danger)]' : 'text-[var(--aw-muted)]'}`}>
          {parsed.error
            ? form.text.trim()
              ? parsed.error
              : 'Paste or type the words.'
            : `${parsed.lines.length} lines · ${parsed.synced ? 'synced' : 'not synced'}`}
        </p>
        <div className="flex flex-wrap items-center justify-end gap-2 pt-1 sm:col-span-2">
          <InlineError error={save.error} className="mr-auto" />
          <Button onClick={onCancel}>Cancel</Button>
          <Button type="submit" variant="primary" pending={save.pending} disabled={Boolean(parsed.error) || !form.rightsBasis || !form.credit.trim()}>
            Save lyrics
          </Button>
        </div>
      </form>
    </Card>
  )
}

/* ------------------------------------------------------------------ chapters */

/** A sermon's or episode's chapters (RFC 0004): scripture reading, sermon, appeal, closing hymn. */
export function ChaptersCard({ item, canEdit }) {
  const load = useCallback((signal) => getMediaChapters(item.id, { signal }), [item.id])
  const chapters = useAsync(load)
  const [editing, setEditing] = useState(false)

  if (chapters.loading) {
    return (
      <Card>
        <CardHeader title="Chapters" />
        <Loading />
      </Card>
    )
  }
  if (chapters.error) {
    return (
      <Card>
        <CardHeader title="Chapters" />
        <LoadError error={chapters.error} onRetry={chapters.reload} />
      </Card>
    )
  }

  const list = chapters.data?.chapters ?? []
  if (editing) {
    return (
      <ChaptersForm
        item={item}
        initial={list}
        onCancel={() => setEditing(false)}
        onSaved={(saved) => {
          chapters.mutate(saved)
          setEditing(false)
        }}
      />
    )
  }

  return (
    <Card>
      <CardHeader
        title="Chapters"
        description={
          list.length
            ? `${list.length} chapters. Listeners jump between them and see where they are.`
            : 'None yet. Chapters let a listener go straight to the scripture reading or the appeal.'
        }
        actions={
          canEdit ? (
            <Button size="sm" icon={list.length ? Pencil : ListOrdered} onClick={() => setEditing(true)}>
              {list.length ? 'Edit' : 'Add chapters'}
            </Button>
          ) : null
        }
      />
      {list.length ? (
        <ol className="space-y-1 px-4 pb-4 text-sm">
          {list.map((c) => (
            <li key={c.startMs} className="flex gap-3">
              <span className="aw-mono w-16 shrink-0 text-[var(--aw-muted)]">{formatTimestamp(c.startMs)}</span>
              <span className="text-[var(--aw-text)]">{c.title}</span>
            </li>
          ))}
        </ol>
      ) : (
        <Empty className="py-4">No chapters.</Empty>
      )}
    </Card>
  )
}

function ChaptersForm({ item, initial, onCancel, onSaved }) {
  const [text, setText] = useState(() => chaptersToText(initial))
  const parsed = useMemo(() => parseChaptersText(text, item.durationMs), [text, item.durationMs])
  const save = useAction()

  const submit = (e) => {
    e.preventDefault()
    if (parsed.error) return
    save.run(async () => {
      onSaved(await saveMediaChapters(item.id, parsed.chapters))
    })
  }

  return (
    <Card>
      <CardHeader title="Edit chapters" description="Saving an empty list removes them all." />
      <form onSubmit={submit} className="grid grid-cols-1 gap-3 p-4">
        <TextArea
          label="Chapters"
          rows={10}
          value={text}
          onChange={setText}
          placeholder={'0:00 Welcome and opening prayer\n4:30 Scripture reading\n9:15 The sermon\n41:00 Appeal'}
          hint="One per line: the time it starts, then its title. h:mm:ss for long services."
        />
        <p className={`text-xs ${parsed.error ? 'text-[var(--aw-danger)]' : 'text-[var(--aw-muted)]'}`}>
          {parsed.error ?? `${parsed.chapters.length} chapters`}
        </p>
        <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
          <InlineError error={save.error} className="mr-auto" />
          <Button onClick={onCancel}>Cancel</Button>
          <Button type="submit" variant="primary" pending={save.pending} disabled={Boolean(parsed.error)}>
            Save chapters
          </Button>
        </div>
      </form>
    </Card>
  )
}

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Ban, Pencil, RotateCw, Send } from 'lucide-react'
import {
  getMediaItem,
  listAlbums,
  listChurchLicenses,
  publishMediaItem,
  requestTranscode,
  updateMediaItem,
  withdrawMediaItem,
} from '../api'
import { Button } from '../components/Button'
import { Card, CardHeader, DefinitionList, TableWrap } from '../components/Card'
import { ConsentChip, MediaStatusChip, TypeChip } from '../components/Chip'
import { SelectInput, TextInput } from '../components/Field'
import { LicensePicker } from '../components/LicensePicker'
import { ChaptersCard, LyricsCard } from '../components/MediaTextCards'
import { InlineError, Notice } from '../components/Notice'
import { PageHeader } from '../components/PageHeader'
import { Empty, LoadError, Loading } from '../components/PageState'
import { PreviewPlayers } from '../components/PreviewPlayers'
import { ResumeIngest } from '../components/ResumeIngest'
import { ReviewNotes } from '../components/ReviewNotes'
import { StatusTimeline } from '../components/StatusTimeline'
import { useAction } from '../hooks/useAction'
import { useAsync } from '../hooks/useAsync'
import { formatBytes, formatDateTime, formatDb, formatDurationMs, listenerGainDb } from '../lib/format'
import { isUsableLicense } from '../lib/license'
import { hasStoredOutputs, sortProfiles } from '../lib/media'
import { PERMISSIONS } from '../lib/roles'
import { useCan } from '../store/useAuthStore'
import { useArtistsById } from '../store/useCatalogStore'

const POLL_MS = 2000
const none = () => Promise.resolve([])

export function MediaDetail() {
  const { id } = useParams()
  const loadItem = useCallback((signal) => getMediaItem(id, { signal }), [id])
  const item = useAsync(loadItem)
  const artistsById = useArtistsById()
  const artist = item.data ? artistsById[item.data.artistId] : null
  const churchId = artist?.churchId ?? null

  const loadLicenses = useCallback(
    (signal) => (churchId ? listChurchLicenses(churchId, { signal }) : none()),
    [churchId],
  )
  const licenses = useAsync(loadLicenses)
  const reloadLicenses = licenses.reload

  const status = item.data?.status
  const { reload, version } = item
  const canEdit = useCan(PERMISSIONS.MEDIA_WRITE)

  // While the worker has it, poll. `version` changes on every answer, so each poll schedules
  // the next one only after the previous has landed. Licences are refetched too: granting one
  // is what turns a waiting item publishable.
  useEffect(() => {
    if (status !== 'processing') return
    const timer = setTimeout(() => {
      reload()
      reloadLicenses()
    }, POLL_MS)
    return () => clearTimeout(timer)
  }, [status, version, reload, reloadLicenses])

  if (item.loading) return <Loading />
  if (!item.data) return <LoadError error={item.error} onRetry={item.reload} />

  const m = item.data
  const license = (licenses.data ?? []).find((l) => l.id === m.licenseId) ?? null

  return (
    <>
      <PageHeader
        back={{ to: '/media', label: 'Media library' }}
        title={m.title}
        meta={
          <>
            <TypeChip type={m.mediaType} />
            <MediaStatusChip status={m.status} />
          </>
        }
        description={
          artist ? (
            <>
              by{' '}
              <Link to={`/artists/${artist.id}`} className="text-[var(--aw-primary)] hover:underline">
                {artist.name}
              </Link>
            </>
          ) : null
        }
      />

      <div className="space-y-5">
        <ActionBar item={m} onItem={item.mutate} />

        {item.error ? <InlineError error={item.error} /> : null}

        {(m.status === 'draft' || m.status === 'failed') && canEdit ? (
          <ResumeIngest key={`${m.id}-${m.status}`} item={m} onItem={item.mutate} />
        ) : null}

        <WaitingNotice item={m} license={license} />
        <ReviewNotes item={m} />

        <Card>
          <CardHeader title="Status" />
          <StatusTimeline item={m} />
        </Card>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <MetadataCard key={m.updatedAt} item={m} canEdit={canEdit} onItem={item.mutate} />
          <LicenseCard
            item={m}
            churchId={churchId}
            licenses={licenses}
            license={license}
            canEdit={canEdit}
            onItem={item.mutate}
          />
        </div>

        {m.mediaType === 'song' ? (
          <LyricsCard key={`lyrics-${m.id}`} item={m} canEdit={canEdit} />
        ) : (
          <ChaptersCard key={`chapters-${m.id}`} item={m} canEdit={canEdit} />
        )}

        <LoudnessCard item={m} />

        <Card>
          <CardHeader title="Outputs" description="One row per stored transcode profile." />
          <AssetsTable assets={m.assets ?? []} />
        </Card>

        <Card>
          <CardHeader
            title="Preview"
            description="Listen before publishing. Locally these are unsigned media-origin URLs."
          />
          {hasStoredOutputs(m) ? (
            <PreviewPlayers key={(m.assets ?? []).map((a) => a.storageKey).join('|')} mediaItemId={m.id} />
          ) : (
            <Empty className="py-4">Nothing to preview until the transcode completes.</Empty>
          )}
        </Card>
      </div>
    </>
  )
}

/* ------------------------------------------------------------------ actions */

function ActionBar({ item, onItem }) {
  const publish = useAction()
  const withdraw = useAction()
  const retry = useAction()
  const mayPublish = useCan(PERMISSIONS.MEDIA_PUBLISH)
  const mayEdit = useCan(PERMISSIONS.MEDIA_WRITE)

  const canPublish =
    mayPublish &&
    (item.status === 'withdrawn' || ((item.status === 'processing' || item.status === 'draft') && hasStoredOutputs(item)))
  const canWithdraw = mayPublish && item.status === 'published'
  const canRetry = mayEdit && item.status === 'failed' && Boolean(item.masterStorageKey)

  if (!canPublish && !canWithdraw && !canRetry) return null

  return (
    <Card>
      <div className="flex flex-wrap items-start gap-4 px-4 py-3">
        {canPublish ? (
          <div className="space-y-1">
            <Button
              variant="primary"
              icon={Send}
              pending={publish.pending}
              onClick={() => publish.run(async () => onItem(await publishMediaItem(item.id)))}
            >
              Publish
            </Button>
            <InlineError error={publish.error} className="max-w-md" />
          </div>
        ) : null}
        {canWithdraw ? (
          <div className="space-y-1">
            <Button
              variant="danger"
              icon={Ban}
              pending={withdraw.pending}
              onClick={() => withdraw.run(async () => onItem(await withdrawMediaItem(item.id)))}
            >
              Withdraw
            </Button>
            <p className="text-[11px] text-[var(--aw-muted)]">Leaves every listener surface. Assets and master stay.</p>
            <InlineError error={withdraw.error} className="max-w-md" />
          </div>
        ) : null}
        {canRetry ? (
          <div className="space-y-1">
            <Button
              icon={RotateCw}
              pending={retry.pending}
              onClick={() => retry.run(async () => onItem(await requestTranscode(item.id, item.masterStorageKey)))}
            >
              Retry transcode
            </Button>
            <p className="text-[11px] text-[var(--aw-muted)]">
              Reuses the stored master <span className="aw-mono">{item.masterStorageKey}</span>.
            </p>
            <InlineError error={retry.error} className="max-w-md" />
          </div>
        ) : null}
      </div>
    </Card>
  )
}

function WaitingNotice({ item, license }) {
  if (item.status !== 'processing') return null
  if (!hasStoredOutputs(item)) {
    return (
      <Notice tone="info" title="Transcoding">
        The worker has the master. This page refreshes every two seconds until it finishes.
      </Notice>
    )
  }
  return (
    <Notice tone="warn" title="Outputs stored; waiting on a licence">
      {!item.licenseId
        ? 'The transcode completed, but no licence is attached. Attach a granted licence, then publish.'
        : license && !isUsableLicense(license)
          ? `The transcode completed. Its licence is ${license.consentStatus}${
              license.consentStatus === 'granted' ? ' but expired' : ''
            }: grant it on the church page, then publish.`
          : 'The transcode completed. If its licence is now granted, publish it.'}
    </Notice>
  )
}

/* ------------------------------------------------------------------ metadata */

const EDITABLE = ['title', 'albumId', 'genre', 'language', 'region', 'coverUrl', 'popularity']

function MetadataCard({ item, canEdit, onItem }) {
  const [editing, setEditing] = useState(false)
  const initial = useMemo(
    () => Object.fromEntries(EDITABLE.map((k) => [k, item[k] == null ? '' : String(item[k])])),
    [item],
  )
  const [form, setForm] = useState(initial)
  const save = useAction()
  const loadAlbums = useCallback((signal) => listAlbums(item.artistId, { signal }), [item.artistId])
  const albums = useAsync(loadAlbums)
  const album = (albums.data ?? []).find((a) => a.id === item.albumId)
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }))

  const submit = (e) => {
    e.preventDefault()
    // PATCH: null leaves a field as it is, so only what changed is sent.
    const patch = {}
    for (const key of EDITABLE) {
      if (form[key] === initial[key]) continue
      patch[key] = key === 'popularity' ? Number(form[key]) : form[key].trim()
    }
    if (!Object.keys(patch).length) {
      setEditing(false)
      return
    }
    save.run(async () => {
      onItem(await updateMediaItem(item.id, patch))
    })
  }

  if (!editing) {
    return (
      <Card>
        <CardHeader
          title="Metadata"
          actions={
            canEdit ? (
              <Button size="sm" icon={Pencil} onClick={() => setEditing(true)}>
                Edit
              </Button>
            ) : null
          }
        />
        <DefinitionList
          items={[
            ['Duration', formatDurationMs(item.durationMs)],
            [
              'Album',
              !item.albumId ? 'None' : album ? album.title : <span key="album" className="aw-mono">{item.albumId.slice(0, 8)}</span>,
            ],
            ['Genre', item.genre || '—'],
            ['Language', item.language || '—'],
            ['Region', item.region || '—'],
            ['Popularity', item.popularity],
            ['Created', formatDateTime(item.createdAt)],
            ['Updated', formatDateTime(item.updatedAt)],
            ['Published', formatDateTime(item.publishedAt)],
            ['Master', item.masterStorageKey ? <span key="master" className="aw-mono">{item.masterStorageKey}</span> : 'Not uploaded'],
            ['Id', <span key="id" className="aw-mono">{item.id}</span>],
          ]}
        />
        {item.coverUrl ? (
          <div className="px-4 pb-4">
            <img src={item.coverUrl} alt="" className="size-24 rounded-xl object-cover" />
          </div>
        ) : null}
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader title="Edit metadata" description="Status changes through the actions, never here." />
      <form onSubmit={submit} className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
        <TextInput className="sm:col-span-2" label="Title" required value={form.title} onChange={set('title')} />
        <SelectInput
          label="Album"
          value={form.albumId}
          onChange={set('albumId')}
          disabled={albums.loading}
          placeholder="No album"
          options={(albums.data ?? []).map((a) => ({ value: a.id, label: a.title }))}
          hint={item.albumId ? 'An album can be changed, not removed.' : undefined}
        />
        <TextInput label="Genre" value={form.genre} onChange={set('genre')} />
        <TextInput label="Language" value={form.language} onChange={set('language')} />
        <TextInput label="Region" value={form.region} onChange={set('region')} />
        <TextInput
          label="Popularity"
          type="number"
          min="0"
          max="100"
          value={form.popularity}
          onChange={set('popularity')}
          hint="0–100. Seeds ranking until real plays exist."
        />
        <TextInput label="Cover URL" type="url" value={form.coverUrl} onChange={set('coverUrl')} />
        {albums.error ? <InlineError error={albums.error} className="sm:col-span-2" /> : null}
        <div className="flex flex-wrap items-center justify-end gap-2 pt-1 sm:col-span-2">
          <InlineError error={save.error} className="mr-auto" />
          <Button
            onClick={() => {
              setForm(initial)
              save.clear()
              setEditing(false)
            }}
          >
            Cancel
          </Button>
          <Button type="submit" variant="primary" pending={save.pending}>
            Save
          </Button>
        </div>
      </form>
    </Card>
  )
}

/* ------------------------------------------------------------------ licence */

function LicenseCard({ item, churchId, licenses, license, canEdit, onItem }) {
  const [choice, setChoice] = useState(null)
  const save = useAction()
  const selected = choice ?? item.licenseId ?? ''

  return (
    <Card>
      <CardHeader
        title="Licence"
        description="Publication needs a granted, unexpired licence. The database trigger enforces it."
        actions={license ? <ConsentChip status={license.consentStatus} /> : null}
      />
      <div className="space-y-3 p-4">
        {!churchId ? (
          <Notice tone="warn">The artist has no church, so there are no licences to choose from.</Notice>
        ) : licenses.loading ? (
          <Loading label="Loading licences…" className="py-2" />
        ) : licenses.error ? (
          <InlineError error={licenses.error} />
        ) : !licenses.data.length ? (
          <Notice tone="warn">
            The church has no licences.{' '}
            <Link to={`/churches/${churchId}`} className="font-semibold underline">
              Create one
            </Link>
            .
          </Notice>
        ) : (
          <>
            <LicensePicker
              name={`license-${item.id}`}
              licenses={licenses.data}
              value={selected}
              onChange={(id) => {
                if (!canEdit) return
                save.clear()
                setChoice(id)
              }}
            />
            <div className={`flex flex-wrap items-center gap-2 ${canEdit ? '' : 'hidden'}`}>
              <Button
                size="sm"
                variant="primary"
                pending={save.pending}
                disabled={!selected || selected === item.licenseId}
                onClick={() =>
                  save.run(async () => {
                    onItem(await updateMediaItem(item.id, { licenseId: selected }))
                    setChoice(null)
                  })
                }
              >
                Change licence
              </Button>
              <Link to={`/churches/${churchId}`} className="text-xs text-[var(--aw-primary)] hover:underline">
                Manage the church&apos;s licences
              </Link>
            </div>
            <InlineError error={save.error} />
          </>
        )}
        {item.licenseId && !license && licenses.data?.length ? (
          <p className="text-xs text-[var(--aw-muted)]">
            The attached licence <span className="aw-mono">{item.licenseId.slice(0, 8)}</span> is not one of this
            church&apos;s.
          </p>
        ) : null}
      </div>
    </Card>
  )
}

/* ------------------------------------------------------------------ audio */

function LoudnessCard({ item }) {
  const gain = listenerGainDb(item.loudnessLufs)
  return (
    <Card>
      <CardHeader
        title="Loudness"
        description="Measured, never applied to the files. Players turn loud items down toward −14 LUFS; quiet ones are never boosted."
      />
      <DefinitionList
        items={[
          ['Integrated loudness', formatDb(item.loudnessLufs, 'LUFS')],
          ['True peak', formatDb(item.truePeakDbfs, 'dBTP')],
          [
            'Listener gain',
            gain == null ? '—' : gain === 0 ? '0.0 dB (quieter than target: played as is)' : `${formatDb(gain)} (attenuation)`,
          ],
        ]}
      />
    </Card>
  )
}

function AssetsTable({ assets }) {
  if (!assets.length) return <Empty className="py-4">No outputs stored.</Empty>
  const order = sortProfiles(assets.map((a) => a.profile))
  const sorted = [...assets].sort((a, b) => order.indexOf(a.profile) - order.indexOf(b.profile))
  return (
    <TableWrap>
      <table className="aw-table">
        <thead>
          <tr>
            <th>Profile</th>
            <th>Codec</th>
            <th className="text-right">Bitrate</th>
            <th className="text-right">Size</th>
            <th className="text-right">Sample rate</th>
            <th className="text-right">Channels</th>
            <th>Checksum (SHA-256)</th>
            <th>Storage key</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((a) => (
            <tr key={a.profile}>
              <td className="aw-mono font-semibold">{a.profile}</td>
              <td className="text-[var(--aw-muted)]">
                {a.codec}
                {a.container ? ` / ${a.container}` : ''}
              </td>
              <td className="text-right tabular-nums">{a.bitrateKbps} kbps</td>
              <td className="text-right tabular-nums">{formatBytes(a.byteSize)}</td>
              <td className="text-right tabular-nums">{a.sampleRateHz ? `${(a.sampleRateHz / 1000).toFixed(1)} kHz` : '—'}</td>
              <td className="text-right tabular-nums">{a.channels}</td>
              <td className="aw-mono text-[var(--aw-muted)]" title={a.checksumSha256}>
                {a.checksumSha256 ? `${a.checksumSha256.slice(0, 16)}…` : '—'}
              </td>
              <td className="aw-mono max-w-[16rem] truncate text-[var(--aw-muted)]" title={a.storageKey}>
                {a.storageKey}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableWrap>
  )
}

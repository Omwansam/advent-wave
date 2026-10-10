import { useCallback, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { BookOpen, Loader2, Mic2, Music, Plus, Upload } from 'lucide-react'
import { createMediaItem, listAlbums, listChurchLicenses } from '../api'
import { Button, ButtonLink } from '../components/Button'
import { Card, CardHeader } from '../components/Card'
import { SelectInput, TextInput } from '../components/Field'
import { FileDrop } from '../components/FileDrop'
import { ArtistFields } from '../components/forms/ArtistForm'
import { IngestProgress } from '../components/IngestProgress'
import { LicensePicker } from '../components/LicensePicker'
import { InlineError, Notice } from '../components/Notice'
import { PageHeader } from '../components/PageHeader'
import { Loading } from '../components/PageState'
import { useAsync } from '../hooks/useAsync'
import { useIngestRunner } from '../hooks/useIngestRunner'
import { useMasterFile } from '../hooks/useMasterFile'
import { blankToNull } from '../lib/forms'
import { INGEST_STEPS, IngestStepError, uploadAndTranscode } from '../lib/ingest'
import { isUsableLicense } from '../lib/license'
import { LOSSY_WARNING, MASTER_ACCEPT, MEDIA_TYPE_LABEL } from '../lib/media'
import { useCatalogStore } from '../store/useCatalogStore'

const TYPE_OPTIONS = [
  { value: 'song', Icon: Music, hint: 'Music ladder: aac_64 to aac_320' },
  { value: 'sermon', Icon: BookOpen, hint: 'Speech ladder: aac_64, aac_128' },
  { value: 'podcast', Icon: Mic2, hint: 'Speech ladder: aac_64, aac_128' },
]

const none = () => Promise.resolve([])

export function AddMedia() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const artists = useCatalogStore((s) => s.artists)
  const churches = useCatalogStore((s) => s.churches)
  const catalogLoaded = useCatalogStore((s) => s.loaded)

  const [mediaType, setMediaType] = useState('song')
  const [artistId, setArtistId] = useState(params.get('artistId') ?? '')
  const [creatingArtist, setCreatingArtist] = useState(false)
  // Licence and album choices belong to the artist they were made for; a new artist starts over.
  const [licenseChoice, setLicenseChoice] = useState({ artistId: null, licenseId: '' })
  const [albumChoice, setAlbumChoice] = useState({ artistId: null, albumId: '' })
  const [details, setDetails] = useState({ title: '', genre: '', language: '', region: '', coverUrl: '' })
  const master = useMasterFile()
  const runner = useIngestRunner()
  const [draftId, setDraftId] = useState(null)
  const [validation, setValidation] = useState(null)

  const artist = artists.find((a) => a.id === artistId) ?? null
  const churchId = artist?.churchId ?? null
  const church = churches.find((c) => c.id === churchId) ?? null

  const loadLicenses = useCallback(
    (signal) => (churchId ? listChurchLicenses(churchId, { signal }) : none()),
    [churchId],
  )
  const licenses = useAsync(loadLicenses)
  const loadAlbums = useCallback((signal) => (artistId ? listAlbums(artistId, { signal }) : none()), [artistId])
  const albums = useAsync(loadAlbums)

  const licenseList = useMemo(() => licenses.data ?? [], [licenses.data])
  const defaultLicenseId = (licenseList.find((l) => isUsableLicense(l)) ?? licenseList[0])?.id ?? ''
  const licenseId = licenseChoice.artistId === artistId ? licenseChoice.licenseId : defaultLicenseId
  const albumId = albumChoice.artistId === artistId ? albumChoice.albumId : ''
  const selectedLicense = licenseList.find((l) => l.id === licenseId) ?? null
  const anyUsable = licenseList.some((l) => isUsableLicense(l))

  const setDetail = (key) => (value) => setDetails((d) => ({ ...d, [key]: value }))
  const locked = runner.running || runner.state?.step === 'done'

  const submit = async () => {
    const problem = !artistId
      ? 'Choose an artist.'
      : !details.title.trim()
        ? 'Give it a title.'
        : !master.file
          ? 'Choose the master file.'
          : !master.allowed
            ? master.extensionError
            : !master.durationMs
              ? 'Enter the duration: the browser could not read it from this file.'
              : null
    setValidation(problem)
    if (problem) return

    const file = master.file
    const item = await runner.run('draft', async ({ signal, onStep, onProgress }) => {
      let draft
      try {
        draft = await createMediaItem(
          {
            mediaType,
            title: details.title.trim(),
            artistId,
            albumId: albumId || null,
            durationMs: master.durationMs,
            coverUrl: blankToNull(details.coverUrl),
            genre: blankToNull(details.genre),
            language: blankToNull(details.language),
            region: blankToNull(details.region),
            licenseId: licenseId || null,
          },
          { signal },
        )
      } catch (error) {
        throw new IngestStepError('draft', error)
      }
      setDraftId(draft.id)
      return uploadAndTranscode({ mediaItemId: draft.id, file, signal, onStep, onProgress })
    })

    if (item) navigate(`/media/${item.id}`, { replace: true })
  }

  return (
    <>
      <PageHeader
        title="Add media"
        description="Create the item, upload its master straight to storage, and send it through the transcode pipeline. If its licence is granted when the transcode completes, it publishes by itself; otherwise it waits for you to publish it."
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-5">
          {/* a. Type */}
          <Card>
            <CardHeader title="1 · Type" />
            <div className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-3" role="radiogroup" aria-label="Media type">
              {TYPE_OPTIONS.map(({ value, Icon, hint }) => {
                const active = mediaType === value
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    disabled={locked}
                    onClick={() => setMediaType(value)}
                    className={`flex items-start gap-3 rounded-xl border px-3 py-3 text-left transition ${
                      active
                        ? 'border-[var(--aw-primary)] bg-[var(--aw-primary)]/8'
                        : 'border-[var(--aw-border)] hover:bg-[var(--aw-card-hover)]'
                    }`}
                  >
                    <Icon className={`mt-0.5 size-5 ${active ? 'text-[var(--aw-primary)]' : 'text-[var(--aw-muted)]'}`} aria-hidden />
                    <span>
                      <span className="block text-sm font-semibold">{MEDIA_TYPE_LABEL[value]}</span>
                      <span className="block text-[11px] text-[var(--aw-muted)]">{hint}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </Card>

          {/* b. Artist and licence */}
          <Card>
            <CardHeader
              title="2 · Artist and licence"
              description="The licence comes from the artist's church."
              actions={
                !creatingArtist ? (
                  <Button size="sm" icon={Plus} disabled={locked} onClick={() => setCreatingArtist(true)}>
                    New artist
                  </Button>
                ) : null
              }
            />
            <div className="space-y-4 p-4">
              {creatingArtist ? (
                <div className="rounded-xl border border-[var(--aw-primary)]/30 bg-[var(--aw-primary)]/5 p-3">
                  <p className="mb-3 text-xs font-semibold">New artist</p>
                  <ArtistFields
                    compact
                    submitLabel="Create and use"
                    onCancel={() => setCreatingArtist(false)}
                    onSaved={(created) => {
                      setCreatingArtist(false)
                      setArtistId(created.id)
                    }}
                  />
                </div>
              ) : (
                <SelectInput
                  label="Artist"
                  required
                  disabled={locked || !catalogLoaded}
                  value={artistId}
                  onChange={setArtistId}
                  placeholder={catalogLoaded ? 'Choose an artist' : 'Loading artists…'}
                  options={artists.map((a) => ({ value: a.id, label: a.name }))}
                />
              )}

              {artist && !creatingArtist ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium">
                    Licence
                    {church ? (
                      <span className="font-normal text-[var(--aw-muted)]">
                        {' '}from{' '}
                        <Link to={`/churches/${church.id}`} className="text-[var(--aw-primary)] hover:underline">
                          {church.name}
                        </Link>
                      </span>
                    ) : null}
                  </p>
                  {!churchId ? (
                    <Notice tone="warn" title="This artist has no church">
                      Without a church there is no licence to attach, so the item cannot publish. You can
                      continue; set the artist&apos;s church and the item&apos;s licence later.
                    </Notice>
                  ) : licenses.loading ? (
                    <Loading label="Loading licences…" className="py-2" />
                  ) : licenses.error ? (
                    <InlineError error={licenses.error} />
                  ) : !licenseList.length ? (
                    <Notice tone="warn" title={`${church?.name ?? 'This church'} has no licences`}>
                      The item cannot publish until it has a granted licence. You can continue, and attach
                      one from the media page once the church has one.
                    </Notice>
                  ) : (
                    <>
                      <LicensePicker
                        licenses={licenseList}
                        value={licenseId}
                        onChange={(id) => !locked && setLicenseChoice({ artistId, licenseId: id })}
                      />
                      {!anyUsable ? (
                        <Notice tone="warn" title="No licence is granted">
                          The item cannot publish until one is. You can continue: the transcode runs now, and
                          the item waits in processing until the licence is granted.
                        </Notice>
                      ) : selectedLicense && !isUsableLicense(selectedLicense) ? (
                        <Notice tone="warn">
                          This licence is {selectedLicense.consentStatus}
                          {selectedLicense.consentStatus === 'granted' ? ' but expired' : ''}. The item will wait in
                          processing until it is granted.
                        </Notice>
                      ) : null}
                    </>
                  )}
                </div>
              ) : null}
            </div>
          </Card>

          {/* c. Details */}
          <Card>
            <CardHeader title="3 · Details" />
            <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
              <TextInput
                className="sm:col-span-2"
                label="Title"
                required
                disabled={locked}
                value={details.title}
                onChange={setDetail('title')}
              />
              <SelectInput
                label="Album"
                hint={albums.error ? undefined : 'Optional. Albums are created on the artist page.'}
                disabled={locked || !artistId || albums.loading}
                value={albumId}
                onChange={(id) => setAlbumChoice({ artistId, albumId: id })}
                placeholder={!artistId ? 'Choose an artist first' : 'No album'}
                options={(albums.data ?? []).map((a) => ({ value: a.id, label: a.title }))}
              />
              <TextInput label="Genre" placeholder="Hymn, gospel…" disabled={locked} value={details.genre} onChange={setDetail('genre')} />
              <TextInput label="Language" placeholder="en, sw, luo…" disabled={locked} value={details.language} onChange={setDetail('language')} />
              <TextInput label="Region" placeholder="East Africa" disabled={locked} value={details.region} onChange={setDetail('region')} />
              <TextInput
                className="sm:col-span-2"
                label="Cover URL"
                type="url"
                placeholder="https://…"
                disabled={locked}
                value={details.coverUrl}
                onChange={setDetail('coverUrl')}
              />
              {albums.error && artistId ? <InlineError error={albums.error} className="sm:col-span-2" /> : null}
            </div>
          </Card>

          {/* d. File */}
          <Card>
            <CardHeader
              title="4 · Master file"
              description="Uploaded as-is and never replaced. The worker never normalises, trims or re-cuts it."
            />
            <div className="space-y-3 p-4">
              <FileDrop
                file={master.file}
                onFile={master.pick}
                accept={MASTER_ACCEPT}
                disabled={locked}
                hint="WAV or FLAC preferred. MP3, AAC, OGG, Opus and video (MP4, MOV, WebM) are accepted."
              />
              {master.extensionError ? <Notice tone="danger">{master.extensionError}</Notice> : null}
              {master.file && master.allowed && master.lossy ? <Notice tone="warn">{LOSSY_WARNING}</Notice> : null}
              {master.file && master.allowed ? (
                <div className="flex flex-wrap items-end gap-3">
                  <TextInput
                    className="w-40"
                    label="Duration"
                    required
                    placeholder="m:ss"
                    disabled={locked}
                    value={master.durationText}
                    onChange={master.setDurationText}
                  />
                  <p className="pb-2 text-[11px] text-[var(--aw-muted)]">
                    {master.detecting ? (
                      <span className="inline-flex items-center gap-1">
                        <Loader2 className="size-3 animate-spin" aria-hidden /> Reading from the file…
                      </span>
                    ) : master.detectedMs ? (
                      'Read from the file. The worker replaces it with the measured value.'
                    ) : (
                      'The browser cannot read this file. Enter an approximate length; the worker measures the real one.'
                    )}
                  </p>
                </div>
              ) : null}
            </div>
          </Card>
        </div>

        {/* e. Submit */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <Card>
            <CardHeader title="5 · Ingest" />
            <div className="space-y-3 p-4">
              {runner.state ? (
                <IngestProgress steps={INGEST_STEPS} state={runner.state} onCancel={runner.cancel} />
              ) : (
                <ol className="list-inside list-decimal space-y-1 text-xs text-[var(--aw-muted)]">
                  {INGEST_STEPS.map((s) => (
                    <li key={s.id}>{s.label}</li>
                  ))}
                </ol>
              )}

              {runner.state?.failed && draftId ? (
                <div className="space-y-2">
                  <p className="text-xs text-[var(--aw-muted)]">
                    The draft was kept. Its page offers to resume from the step that failed.
                  </p>
                  <ButtonLink to={`/media/${draftId}`} variant="primary" className="w-full">
                    Open the draft
                  </ButtonLink>
                </div>
              ) : (
                <Button
                  variant="primary"
                  icon={Upload}
                  className="w-full"
                  pending={runner.running}
                  disabled={locked || creatingArtist}
                  onClick={submit}
                >
                  Create and upload
                </Button>
              )}
              {runner.state?.failed && !draftId ? (
                <Button className="w-full" onClick={runner.reset}>
                  Edit and try again
                </Button>
              ) : null}
              {validation ? <p className="text-xs text-[var(--aw-danger)]">{validation}</p> : null}
            </div>
          </Card>
        </div>
      </div>
    </>
  )
}

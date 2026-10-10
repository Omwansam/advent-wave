import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { RotateCw, Upload } from 'lucide-react'
import { listMedia } from '../api'
import { Button, ButtonLink } from '../components/Button'
import { Card } from '../components/Card'
import { FilterSelect, SearchInput } from '../components/Field'
import { MediaTable } from '../components/MediaTable'
import { PageHeader } from '../components/PageHeader'
import { AsyncBody } from '../components/PageState'
import { useAsync } from '../hooks/useAsync'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { MEDIA_STATUSES, MEDIA_TYPE_LABEL, MEDIA_TYPES } from '../lib/media'
import { PERMISSIONS } from '../lib/roles'
import { useCan } from '../store/useAuthStore'

const LIMIT = 500

export function MediaLibrary() {
  const [params, setParams] = useSearchParams()
  const status = params.get('status') ?? ''
  const mediaType = params.get('type') ?? ''
  const q = params.get('q') ?? ''
  const debouncedQ = useDebouncedValue(q.trim(), 300)
  const canAdd = useCan(PERMISSIONS.MEDIA_WRITE)

  const setParam = (key, value) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  // The server filters by status, and (RFC 0001) by type and title. The same filters are
  // applied here too, so a gateway that ignores the newer parameters still shows the right rows.
  const load = useCallback(
    (signal) =>
      listMedia({ status, mediaType, q: debouncedQ, limit: LIMIT }, { signal }).then((list) => {
        const needle = debouncedQ.toLowerCase()
        return list.filter(
          (m) =>
            (!status || m.status === status) &&
            (!mediaType || m.mediaType === mediaType) &&
            (!needle || m.title?.toLowerCase().includes(needle)),
        )
      }),
    [status, mediaType, debouncedQ],
  )
  const media = useAsync(load)

  const counts = useMemo(() => {
    if (status || !media.data) return null
    return Object.fromEntries(MEDIA_STATUSES.map((s) => [s, media.data.filter((m) => m.status === s).length]))
  }, [media.data, status])

  return (
    <>
      <PageHeader
        title="Media library"
        description="Every song, sermon and podcast, at any status. Newest-updated first."
        actions={
          <>
            <Button icon={RotateCw} onClick={media.reload} pending={media.refreshing}>
              Refresh
            </Button>
            {canAdd ? (
              <ButtonLink variant="primary" icon={Upload} to="/media/new">
                Add media
              </ButtonLink>
            ) : null}
          </>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--aw-border)] px-4 py-3">
          <SearchInput value={q} onChange={(v) => setParam('q', v)} placeholder="Search titles" className="max-w-xs" />
          <FilterSelect
            label="Type"
            value={mediaType}
            onChange={(v) => setParam('type', v)}
            options={[{ value: '', label: 'All types' }, ...MEDIA_TYPES.map((t) => ({ value: t, label: MEDIA_TYPE_LABEL[t] }))]}
          />
          <div className="flex flex-wrap gap-1" role="group" aria-label="Status">
            {['', ...MEDIA_STATUSES].map((s) => {
              const active = status === s
              return (
                <button
                  key={s || 'all'}
                  type="button"
                  onClick={() => setParam('status', s)}
                  aria-pressed={active}
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                    active
                      ? 'bg-[var(--aw-primary)] text-white'
                      : 'bg-[var(--aw-tile)] text-[var(--aw-muted)] hover:bg-[var(--aw-tile-hover)] hover:text-[var(--aw-text)]'
                  }`}
                >
                  {s || 'All'}
                  {counts && s ? <span className="ml-1 opacity-70">{counts[s]}</span> : null}
                </button>
              )
            })}
          </div>
          {media.data ? (
            <span className="ml-auto text-xs text-[var(--aw-muted)]">
              {media.data.length}
              {media.data.length >= LIMIT ? '+' : ''} items
            </span>
          ) : null}
        </div>
        <AsyncBody state={media} isEmpty={(list) => !list.length} empty="Nothing matches these filters.">
          {(list) => <MediaTable items={list} />}
        </AsyncBody>
      </Card>
    </>
  )
}

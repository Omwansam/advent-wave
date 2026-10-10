import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { Ban, ChevronDown, Headphones, RotateCw, Send } from 'lucide-react'
import { listMedia, publishMediaItem, requestTranscode, withdrawMediaItem } from '../api'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { MediaStatusChip, TypeChip } from '../components/Chip'
import { InlineError } from '../components/Notice'
import { PageHeader } from '../components/PageHeader'
import { AsyncBody } from '../components/PageState'
import { PreviewPlayers } from '../components/PreviewPlayers'
import { ReviewNotes } from '../components/ReviewNotes'
import { useAction } from '../hooks/useAction'
import { useAsync } from '../hooks/useAsync'
import { formatDurationMs, formatRelative } from '../lib/format'
import { reviewFlagsOf } from '../lib/media'
import { PERMISSIONS } from '../lib/roles'
import { useCan } from '../store/useAuthStore'
import { useArtistsById } from '../store/useCatalogStore'

/** Failed items, and items carrying review flags at any status. Oldest first: they have waited longest. */
async function loadQueue(signal) {
  const [failed, all] = await Promise.all([
    listMedia({ status: 'failed', limit: 500 }, { signal }),
    listMedia({ limit: 500 }, { signal }),
  ])
  const byId = new Map()
  for (const m of [...failed, ...all]) {
    if (m.status === 'failed' || reviewFlagsOf(m).length) byId.set(m.id, m)
  }
  return [...byId.values()].sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt))
}

export function ReviewQueue() {
  const load = useCallback((signal) => loadQueue(signal), [])
  const queue = useAsync(load)

  const replace = (next) => queue.mutate((list) => list.map((m) => (m.id === next.id ? { ...m, ...next } : m)))

  return (
    <>
      <PageHeader
        title="Review queue"
        description="Failed transcodes and flagged recordings, oldest first. Flags never block publishing, and nothing is fixed automatically: listen, then decide."
        actions={
          <Button icon={RotateCw} pending={queue.refreshing} onClick={queue.reload}>
            Refresh
          </Button>
        }
      />
      <AsyncBody state={queue} isEmpty={(list) => !list.length} empty="The queue is empty.">
        {(list) => (
          <div className="space-y-3">
            {list.map((m) => (
              <ReviewRow key={m.id} item={m} onItem={replace} />
            ))}
          </div>
        )}
      </AsyncBody>
    </>
  )
}

function ReviewRow({ item, onItem }) {
  const artistsById = useArtistsById()
  const [open, setOpen] = useState(false)
  const action = useAction()
  const flags = reviewFlagsOf(item)
  const mayPublish = useCan(PERMISSIONS.MEDIA_PUBLISH)
  const mayEdit = useCan(PERMISSIONS.MEDIA_WRITE)

  const act = (fn) => action.run(async () => onItem(await fn()))

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="rounded-md p-0.5 text-[var(--aw-muted)] hover:bg-[var(--aw-surface-elevated)]"
          aria-label={open ? 'Collapse' : 'Expand'}
        >
          <ChevronDown className={`size-4 transition ${open ? '' : '-rotate-90'}`} />
        </button>
        <Link to={`/media/${item.id}`} className="font-semibold hover:text-[var(--aw-primary)]">
          {item.title}
        </Link>
        <TypeChip type={item.mediaType} />
        <MediaStatusChip status={item.status} />
        <span className="text-xs text-[var(--aw-muted)]">{artistsById[item.artistId]?.name}</span>
        <span className="text-xs tabular-nums text-[var(--aw-muted)]">{formatDurationMs(item.durationMs)}</span>
        <span className="text-xs text-[var(--aw-muted)]">
          {flags.length ? `${flags.length} flag${flags.length > 1 ? 's' : ''} · ` : ''}
          {formatRelative(item.updatedAt)}
        </span>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {item.status !== 'draft' && item.status !== 'failed' ? (
            <Button size="sm" icon={Headphones} onClick={() => setOpen(true)}>
              Preview
            </Button>
          ) : null}
          {mayPublish && (item.status === 'processing' || item.status === 'withdrawn') ? (
            <Button
              size="sm"
              variant="primary"
              icon={Send}
              pending={action.pending}
              onClick={() => act(() => publishMediaItem(item.id))}
            >
              Publish
            </Button>
          ) : null}
          {mayPublish && item.status === 'published' ? (
            <Button
              size="sm"
              variant="danger"
              icon={Ban}
              pending={action.pending}
              onClick={() => act(() => withdrawMediaItem(item.id))}
            >
              Withdraw
            </Button>
          ) : null}
          {mayEdit && item.status === 'failed' && item.masterStorageKey ? (
            <Button
              size="sm"
              icon={RotateCw}
              pending={action.pending}
              onClick={() => act(() => requestTranscode(item.id, item.masterStorageKey))}
            >
              Retry transcode
            </Button>
          ) : null}
        </div>
      </div>

      {action.error ? <InlineError error={action.error} className="px-4 pb-3" /> : null}

      {open ? (
        <div className="space-y-3 border-t border-[var(--aw-border)] px-4 py-3">
          <ReviewNotes item={item} />
          {item.status !== 'draft' && item.status !== 'failed' ? (
            <div className="-mx-4">
              <PreviewPlayers mediaItemId={item.id} />
            </div>
          ) : null}
        </div>
      ) : null}
    </Card>
  )
}

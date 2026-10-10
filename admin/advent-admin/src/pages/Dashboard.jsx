import { useCallback } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Clock, Flag, Hourglass, RotateCw, Upload } from 'lucide-react'
import { getMediaItem, listMedia } from '../api'
import { Button, ButtonLink } from '../components/Button'
import { Card, CardHeader } from '../components/Card'
import { MediaStatusChip, TypeChip } from '../components/Chip'
import { PageHeader } from '../components/PageHeader'
import { LoadError, Loading } from '../components/PageState'
import { useAsync } from '../hooks/useAsync'
import { formatRelative } from '../lib/format'
import { describeFlag, MEDIA_STATUSES, reviewFlagsOf, STUCK_PROCESSING_MS } from '../lib/media'
import { PERMISSIONS } from '../lib/roles'
import { useCan } from '../store/useAuthStore'
import { useArtistsById } from '../store/useCatalogStore'

const LIMIT = 500
/** Processing items are few; each needs its detail to know whether outputs are stored. */
const DETAIL_CAP = 50

async function loadDashboard(signal) {
  const lists = await Promise.all(MEDIA_STATUSES.map((status) => listMedia({ status, limit: LIMIT }, { signal })))
  const byStatus = Object.fromEntries(MEDIA_STATUSES.map((s, i) => [s, lists[i]]))

  // The list omits assets, so "stored but waiting on a licence" needs each processing item's detail.
  const processing = await Promise.all(
    byStatus.processing.slice(0, DETAIL_CAP).map((m) => getMediaItem(m.id, { signal })),
  )

  const now = Date.now()
  const waiting = processing.filter((m) => m.assets?.length)
  const stuck = processing.filter(
    (m) => !m.assets?.length && now - new Date(m.updatedAt).getTime() > STUCK_PROCESSING_MS,
  )
  const flagged = lists.flat().filter((m) => reviewFlagsOf(m).length)

  return {
    now,
    counts: Object.fromEntries(MEDIA_STATUSES.map((s) => [s, byStatus[s].length])),
    failed: byStatus.failed,
    flagged,
    stuck,
    waiting,
  }
}

const TILE_TONE = {
  draft: 'text-[var(--aw-muted)]',
  processing: 'text-[var(--aw-info)]',
  published: 'text-[var(--aw-ok)]',
  withdrawn: 'text-[var(--aw-warn)]',
  failed: 'text-[var(--aw-danger)]',
}

export function Dashboard() {
  const load = useCallback((signal) => loadDashboard(signal), [])
  const dashboard = useAsync(load)
  const canAdd = useCan(PERMISSIONS.MEDIA_WRITE)

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="The catalogue at a glance, and what needs a person."
        actions={
          <>
            <Button icon={RotateCw} pending={dashboard.refreshing} onClick={dashboard.reload}>
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

      {dashboard.loading ? (
        <Loading />
      ) : !dashboard.data ? (
        <LoadError error={dashboard.error} onRetry={dashboard.reload} />
      ) : (
        <DashboardBody data={dashboard.data} />
      )}
    </>
  )
}

function DashboardBody({ data }) {
  const artistsById = useArtistsById()
  const attention = data.failed.length + data.flagged.length + data.stuck.length + data.waiting.length

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {MEDIA_STATUSES.map((status) => (
          <Link
            key={status}
            to={`/media?status=${status}`}
            className="rounded-2xl border border-[var(--aw-border)] bg-[var(--aw-surface)] px-4 py-3 shadow-[var(--aw-shadow-card)] transition hover:shadow-[var(--aw-shadow-hover)]"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--aw-muted)]">{status}</p>
            <p className={`mt-1 text-2xl font-bold tabular-nums ${TILE_TONE[status]}`}>
              {data.counts[status]}
              {data.counts[status] >= LIMIT ? '+' : ''}
            </p>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader
          title="Needs attention"
          description={attention ? `${attention} items` : 'Nothing needs attention.'}
          actions={
            <ButtonLink size="sm" to="/review">
              Review queue
            </ButtonLink>
          }
        />
        <div className="divide-y divide-[var(--aw-border)]">
          <AttentionGroup
            Icon={AlertTriangle}
            tone="text-[var(--aw-danger)]"
            title="Failed"
            items={data.failed}
            artistsById={artistsById}
            now={data.now}
            detail={(m) => m.failureReason || 'No reason recorded.'}
          />
          <AttentionGroup
            Icon={Flag}
            tone="text-[var(--aw-warn)]"
            title="Review flags"
            items={data.flagged}
            artistsById={artistsById}
            now={data.now}
            detail={(m) => reviewFlagsOf(m).map((f) => describeFlag(f).title).join(' · ')}
          />
          <AttentionGroup
            Icon={Clock}
            tone="text-[var(--aw-info)]"
            title="Processing for more than 30 minutes"
            items={data.stuck}
            artistsById={artistsById}
            now={data.now}
            detail={(m) => `In processing since ${formatRelative(m.updatedAt, data.now)}. Check the gateway log for this id.`}
          />
          <AttentionGroup
            Icon={Hourglass}
            tone="text-[var(--aw-gold)]"
            title="Outputs stored, waiting on a licence"
            items={data.waiting}
            artistsById={artistsById}
            now={data.now}
            detail={(m) => (m.licenseId ? 'Grant its licence, then publish.' : 'No licence attached.')}
          />
        </div>
      </Card>
    </div>
  )
}

function AttentionGroup({ Icon, tone, title, items, artistsById, now, detail }) {
  if (!items.length) return null
  return (
    <section className="px-4 py-3">
      <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
        <Icon className={`size-4 ${tone}`} aria-hidden />
        {title}
        <span className="rounded-full bg-[var(--aw-tile)] px-1.5 text-[var(--aw-muted)]">{items.length}</span>
      </h3>
      <ul className="space-y-1">
        {items.slice(0, 10).map((m) => (
          <li key={m.id}>
            <Link
              to={`/media/${m.id}`}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-2 py-1.5 hover:bg-[var(--aw-card-hover)]"
            >
              <span className="font-medium">{m.title}</span>
              <TypeChip type={m.mediaType} />
              <MediaStatusChip status={m.status} />
              <span className="text-xs text-[var(--aw-muted)]">{artistsById[m.artistId]?.name}</span>
              <span className="w-full text-xs text-[var(--aw-muted)] sm:ml-auto sm:w-auto">
                {formatRelative(m.updatedAt, now)}
              </span>
              <span className="w-full break-words text-xs text-[var(--aw-text)]/80">{detail(m)}</span>
            </Link>
          </li>
        ))}
        {items.length > 10 ? (
          <li className="px-2 text-xs text-[var(--aw-muted)]">and {items.length - 10} more</li>
        ) : null}
      </ul>
    </section>
  )
}

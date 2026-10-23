import { useSearchParams } from 'react-router-dom'
import { FilterChips } from '../components/FilterChips'
import { ProfileCard } from '../components/ProfileCard'
import { PageError, PageLoading } from '../components/PageState'
import { getArtists, getConferences } from '../api'
import { useApi } from '../hooks/useApi'
import { PROFILE_FILTERS } from '../utils/profile'

/**
 * /choirs — every church, choir, group, preacher and ministry with something to hear (RFC 0009),
 * the most listened to first. `?filter=` picks a chip, `?conference=` a conference, field or
 * union; both stay in the address so a profile page can link straight to its conference.
 */
export function Choirs() {
  const [params, setParams] = useSearchParams()
  const filterId = PROFILE_FILTERS.some((f) => f.id === params.get('filter')) ? params.get('filter') : 'all'
  const conference = params.get('conference') || ''
  const filter = PROFILE_FILTERS.find((f) => f.id === filterId)

  const { data: structure } = useApi((signal) => getConferences({ signal }), [])
  const { data, error, loading, refetch } = useApi(
    (signal) => getArtists({ ...filter.query, conference: conference || undefined, limit: 100 }, { signal }),
    [filterId, conference],
  )

  const set = (key, value, fallback) => {
    const next = new URLSearchParams(params)
    if (!value || value === fallback) next.delete(key)
    else next.set(key, value)
    setParams(next, { replace: true })
  }

  const profiles = data?.artists ?? []
  const unions = structure?.unions ?? []

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-[var(--aw-text)] md:text-4xl">Choirs & churches</h1>
        <p className="mt-2 max-w-2xl text-[var(--aw-muted)]">
          Church choirs, youth and children’s choirs, independent groups, preachers and ministries from across the
          Adventist church in Kenya. Open one to hear everything it has shared.
        </p>
      </header>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <FilterChips options={PROFILE_FILTERS} value={filterId} onChange={(id) => set('filter', id, 'all')} label="Filter profiles" />
        {unions.length ? (
          <label className="flex items-center gap-2 text-sm text-[var(--aw-muted)]">
            <span>Conference</span>
            <select
              value={conference}
              onChange={(e) => set('conference', e.target.value, '')}
              className="max-w-[16rem] rounded-full border border-[var(--aw-border)] bg-[var(--aw-surface)] px-3 py-1.5 text-sm text-[var(--aw-text)]"
            >
              <option value="">All of Kenya</option>
              {unions.map((u) => (
                <optgroup key={u.id} label={u.name}>
                  <option value={u.id}>All of {u.shortName ?? u.name}</option>
                  {(u.conferences ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.churches ? ` (${c.churches})` : ''}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {loading ? (
        <PageLoading sections={1} />
      ) : error ? (
        <PageError error={error} onRetry={refetch} what="choirs and churches" />
      ) : profiles.length ? (
        <div className="-mx-3 flex flex-wrap">
          {profiles.map((p) => (
            <ProfileCard key={p.id} profile={p} />
          ))}
        </div>
      ) : (
        <p className="rounded-2xl bg-[var(--aw-surface)] p-6 text-sm text-[var(--aw-muted)] ring-1 ring-black/[0.04] dark:ring-white/10">
          Nothing here yet{conference ? ' in this conference' : ''}. As churches and choirs share their recordings, they
          appear on this page.
        </p>
      )}
    </div>
  )
}

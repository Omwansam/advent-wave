import { useCallback } from 'react'
import { getMediaPreview } from '../api'
import { useAsync } from '../hooks/useAsync'
import { sortProfiles } from '../lib/media'
import { Empty, LoadError, Loading } from './PageState'

/**
 * One player per stored profile, from /media/{id}/preview, so an item can be heard before it
 * is published. Give it a `key` that changes with the item's outputs to refetch the URLs.
 */
export function PreviewPlayers({ mediaItemId }) {
  const load = useCallback((signal) => getMediaPreview(mediaItemId, { signal }), [mediaItemId])
  const preview = useAsync(load)

  if (preview.loading) return <Loading label="Loading previews…" className="py-4" />
  if (preview.error) return <LoadError error={preview.error} onRetry={preview.reload} className="py-4" />

  const profiles = sortProfiles(Object.keys(preview.data ?? {}))
  if (!profiles.length) return <Empty className="py-4">No outputs stored yet.</Empty>

  return (
    <ul className="divide-y divide-[var(--aw-border)]">
      {profiles.map((profile) => (
        <li key={profile} className="flex flex-wrap items-center gap-3 px-4 py-2">
          <span className="aw-mono w-28 shrink-0 font-semibold">{profile}</span>
          <audio controls preload="none" src={preview.data[profile]} className="h-8 min-w-0 flex-1">
            <track kind="captions" />
          </audio>
        </li>
      ))}
    </ul>
  )
}

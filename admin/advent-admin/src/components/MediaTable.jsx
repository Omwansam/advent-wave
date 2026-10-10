import { useNavigate } from 'react-router-dom'
import { Flag } from 'lucide-react'
import { formatDurationMs, formatRelative } from '../lib/format'
import { reviewFlagsOf } from '../lib/media'
import { useArtistsById } from '../store/useCatalogStore'
import { MediaStatusChip, TypeChip } from './Chip'
import { TableWrap } from './Card'

export function MediaTable({ items, showArtist = true }) {
  const navigate = useNavigate()
  const artistsById = useArtistsById()

  return (
    <TableWrap>
      <table className="aw-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Type</th>
            {showArtist ? <th>Artist</th> : null}
            <th>Status</th>
            <th className="text-right">Duration</th>
            <th>Updated</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const flags = reviewFlagsOf(item)
            return (
              <tr
                key={item.id}
                className="aw-row-link"
                onClick={() => navigate(`/media/${item.id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') navigate(`/media/${item.id}`)
                }}
                tabIndex={0}
              >
                <td className="max-w-xs">
                  <div className="flex items-center gap-2">
                    {item.coverUrl ? (
                      <img src={item.coverUrl} alt="" className="size-8 shrink-0 rounded-md object-cover" loading="lazy" />
                    ) : (
                      <span className="size-8 shrink-0 rounded-md bg-[var(--aw-tile)]" aria-hidden />
                    )}
                    <span className="truncate font-medium">{item.title}</span>
                    {flags.length ? (
                      <Flag className="size-3.5 shrink-0 text-[var(--aw-warn)]" aria-label={`${flags.length} review flags`} />
                    ) : null}
                  </div>
                </td>
                <td>
                  <TypeChip type={item.mediaType} />
                </td>
                {showArtist ? (
                  <td className="max-w-[12rem] truncate text-[var(--aw-muted)]">
                    {artistsById[item.artistId]?.name ?? '—'}
                  </td>
                ) : null}
                <td>
                  <MediaStatusChip status={item.status} />
                </td>
                <td className="text-right tabular-nums text-[var(--aw-muted)]">{formatDurationMs(item.durationMs)}</td>
                <td className="whitespace-nowrap text-[var(--aw-muted)]" title={item.updatedAt}>
                  {formatRelative(item.updatedAt)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </TableWrap>
  )
}

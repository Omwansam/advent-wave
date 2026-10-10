import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BadgeCheck, Plus } from 'lucide-react'
import { listArtists } from '../api'
import { Button } from '../components/Button'
import { Card, TableWrap } from '../components/Card'
import { SearchInput } from '../components/Field'
import { ArtistForm } from '../components/forms/ArtistForm'
import { PageHeader } from '../components/PageHeader'
import { AsyncBody } from '../components/PageState'
import { useAsync } from '../hooks/useAsync'
import { formatDate } from '../lib/format'
import { PERMISSIONS } from '../lib/roles'
import { useCan } from '../store/useAuthStore'
import { useChurchesById } from '../store/useCatalogStore'

export function Artists() {
  const navigate = useNavigate()
  const load = useCallback((signal) => listArtists({ signal }), [])
  const artists = useAsync(load)
  const churchesById = useChurchesById()
  const [creating, setCreating] = useState(false)
  const [q, setQ] = useState('')
  const canEdit = useCan(PERMISSIONS.MEDIA_WRITE)

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const list = artists.data ?? []
    if (!needle) return list
    return list.filter((a) => [a.name, a.slug].some((v) => v?.toLowerCase().includes(needle)))
  }, [artists.data, q])

  return (
    <>
      <PageHeader
        title="Artists"
        description="Choirs, preachers and hosts. Each belongs to a church, whose licences its recordings use."
        actions={
          canEdit ? (
            <Button variant="primary" icon={Plus} onClick={() => setCreating(true)}>
              New artist
            </Button>
          ) : null
        }
      />

      <Card>
        <div className="border-b border-[var(--aw-border)] px-4 py-3">
          <SearchInput value={q} onChange={setQ} placeholder="Search artists" className="max-w-xs" />
        </div>
        <AsyncBody
          state={artists}
          isEmpty={() => !filtered.length}
          empty={q ? 'No artist matches that search.' : 'No artists yet.'}
        >
          {() => (
            <TableWrap>
              <table className="aw-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Slug</th>
                    <th>Church</th>
                    <th>Verified</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a) => (
                    <tr
                      key={a.id}
                      className="aw-row-link"
                      tabIndex={0}
                      onClick={() => navigate(`/artists/${a.id}`)}
                      onKeyDown={(e) => e.key === 'Enter' && navigate(`/artists/${a.id}`)}
                    >
                      <td>
                        <div className="flex items-center gap-2">
                          {a.coverUrl ? (
                            <img src={a.coverUrl} alt="" className="size-7 rounded-full object-cover" loading="lazy" />
                          ) : (
                            <span className="size-7 rounded-full bg-[var(--aw-tile)]" aria-hidden />
                          )}
                          <span className="font-medium">{a.name}</span>
                        </div>
                      </td>
                      <td className="aw-mono text-[var(--aw-muted)]">{a.slug}</td>
                      <td className="text-[var(--aw-muted)]">
                        {a.churchId ? (churchesById[a.churchId]?.name ?? a.churchId.slice(0, 8)) : 'No church'}
                      </td>
                      <td>
                        {a.verified ? (
                          <BadgeCheck className="size-4 text-[var(--aw-primary)]" aria-label="Verified" />
                        ) : (
                          <span className="text-[var(--aw-muted)]">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap text-[var(--aw-muted)]">{formatDate(a.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}
        </AsyncBody>
      </Card>

      {creating ? (
        <ArtistForm
          onClose={() => setCreating(false)}
          onSaved={(artist) => {
            setCreating(false)
            navigate(`/artists/${artist.id}`)
          }}
        />
      ) : null}
    </>
  )
}

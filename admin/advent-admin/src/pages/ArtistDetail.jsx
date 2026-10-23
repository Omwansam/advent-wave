import { useCallback, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BadgeCheck, Pencil, Plus, Upload } from 'lucide-react'
import { getArtist, listAlbums, listMedia } from '../api'
import { Button, ButtonLink } from '../components/Button'
import { Card, CardHeader, DefinitionList, TableWrap } from '../components/Card'
import { AlbumForm } from '../components/forms/AlbumForm'
import { ArtistForm } from '../components/forms/ArtistForm'
import { MediaTable } from '../components/MediaTable'
import { PageHeader } from '../components/PageHeader'
import { AsyncBody, LoadError, Loading } from '../components/PageState'
import { useAsync } from '../hooks/useAsync'
import { formatDate, formatDateTime } from '../lib/format'
import { PERMISSIONS } from '../lib/roles'
import { useCan } from '../store/useAuthStore'
import { useArtistsById, useCatalogStore, useChurchesById } from '../store/useCatalogStore'

export function ArtistDetail() {
  const { id } = useParams()
  const loadArtist = useCallback((signal) => getArtist(id, { signal }), [id])
  const artist = useAsync(loadArtist)
  const loadAlbums = useCallback((signal) => listAlbums(id, { signal }), [id])
  const albums = useAsync(loadAlbums)
  // The list endpoint has no artist filter; an artist's catalogue fits well inside its cap.
  const loadMedia = useCallback(
    (signal) => listMedia({ limit: 500 }, { signal }).then((list) => list.filter((m) => m.artistId === id)),
    [id],
  )
  const media = useAsync(loadMedia)
  const churchesById = useChurchesById()
  const artistsById = useArtistsById()
  const conferences = useCatalogStore((s) => s.conferences)
  const [editing, setEditing] = useState(false)
  const [albumForm, setAlbumForm] = useState(null)
  const canEdit = useCan(PERMISSIONS.MEDIA_WRITE)

  if (artist.loading) return <Loading />
  if (!artist.data) return <LoadError error={artist.error} onRetry={artist.reload} />

  const a = artist.data
  const church = a.churchId ? churchesById[a.churchId] : null
  const home = a.homeChurchId ? artistsById[a.homeChurchId] : null
  const conference = a.conferenceId ? conferences.find((c) => c.id === a.conferenceId) : null
  const kind = a.kind === 'choir' ? `Choir — ${a.ensemble ?? 'main'}` : a.kind

  return (
    <>
      <PageHeader
        back={{ to: '/artists', label: 'Artists' }}
        title={a.name}
        meta={a.verified ? <BadgeCheck className="size-5 text-[var(--aw-primary)]" aria-label="Verified" /> : null}
        actions={
          canEdit ? (
            <>
              <Button icon={Pencil} onClick={() => setEditing(true)}>
                Edit
              </Button>
              <ButtonLink variant="primary" icon={Upload} to={`/media/new?artistId=${a.id}`}>
                Add media
              </ButtonLink>
            </>
          ) : null
        }
      />

      <div className="grid grid-cols-1 gap-5">
        <Card>
          <div className="flex flex-col gap-4 sm:flex-row">
            {a.coverUrl ? (
              <img src={a.coverUrl} alt="" className="m-4 mb-0 size-28 rounded-2xl object-cover sm:mb-4 sm:mr-0" />
            ) : null}
            <div className="min-w-0 flex-1">
              <DefinitionList
                items={[
                  ['Slug', <span key="slug" className="aw-mono">{a.slug}</span>],
                  ['Kind', <span key="kind" className="capitalize">{kind}</span>],
                  [
                    'Home church',
                    a.homeChurchId ? (
                      <Link key="home" to={`/artists/${a.homeChurchId}`} className="text-[var(--aw-primary)] hover:underline">
                        {home?.name ?? a.homeChurchId}
                      </Link>
                    ) : a.kind === 'church' ? (
                      'This is a church profile'
                    ) : (
                      'Independent'
                    ),
                  ],
                  ['Conference', conference?.name ?? (a.conferenceId || 'Not set')],
                  ['Location', a.location || '—'],
                  [
                    'Rights holder',
                    a.churchId ? (
                      <Link key="church" to={`/churches/${a.churchId}`} className="text-[var(--aw-primary)] hover:underline">
                        {church?.name ?? a.churchId}
                      </Link>
                    ) : (
                      'No church: its recordings have no licence to use'
                    ),
                  ],
                  ['Created', formatDateTime(a.createdAt)],
                ]}
              />
              {a.bio ? <p className="px-4 pb-4 text-sm text-[var(--aw-muted)]">{a.bio}</p> : null}
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Albums"
            actions={
              canEdit ? (
                <Button size="sm" icon={Plus} onClick={() => setAlbumForm({})}>
                  New album
                </Button>
              ) : null
            }
          />
          <AsyncBody state={albums} isEmpty={(list) => !list.length} empty="No albums yet.">
            {(list) => (
              <TableWrap>
                <table className="aw-table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Release date</th>
                      <th>Created</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((album) => (
                      <tr key={album.id}>
                        <td>
                          <div className="flex items-center gap-2">
                            {album.coverUrl ? (
                              <img src={album.coverUrl} alt="" className="size-8 rounded-md object-cover" loading="lazy" />
                            ) : (
                              <span className="size-8 rounded-md bg-[var(--aw-tile)]" aria-hidden />
                            )}
                            <span className="font-medium">{album.title}</span>
                          </div>
                        </td>
                        <td className="text-[var(--aw-muted)]">{formatDate(album.releaseDate)}</td>
                        <td className="text-[var(--aw-muted)]">{formatDate(album.createdAt)}</td>
                        <td className="text-right">
                          {canEdit ? (
                            <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setAlbumForm({ album })}>
                              Edit
                            </Button>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            )}
          </AsyncBody>
        </Card>

        <Card>
          <CardHeader title="Media" description="Every item by this artist, at any status." />
          <AsyncBody state={media} isEmpty={(list) => !list.length} empty="No media yet.">
            {(list) => <MediaTable items={list} showArtist={false} />}
          </AsyncBody>
        </Card>
      </div>

      {editing ? (
        <ArtistForm
          artist={a}
          onClose={() => setEditing(false)}
          onSaved={(saved) => {
            setEditing(false)
            artist.mutate(saved)
          }}
        />
      ) : null}
      {albumForm ? (
        <AlbumForm
          key={albumForm.album?.id ?? 'new'}
          album={albumForm.album}
          artistId={a.id}
          onClose={() => setAlbumForm(null)}
          onSaved={() => {
            setAlbumForm(null)
            albums.reload()
          }}
        />
      ) : null}
    </>
  )
}

import { MediaCard } from './MediaCard'
import { Shelf } from './Shelf'
import { profileSubtitle } from '../utils/profile'

/** A church, choir, group or preacher on a shelf or grid: a round picture, its name and what it is. */
export function ProfileCard({ profile }) {
  return (
    <MediaCard
      to={`/artist/${profile.id}`}
      title={profile.name}
      subtitle={profileSubtitle(profile)}
      cover={profile.cover}
      round
      canPlay={false}
    />
  )
}

/** A titled rail of profile cards; nothing when there are none. */
export function ProfileShelf({ eyebrow, title, to, profiles }) {
  if (!profiles?.length) return null
  return (
    <Shelf eyebrow={eyebrow} title={title} to={to}>
      {profiles.map((p) => (
        <ProfileCard key={p.id} profile={p} />
      ))}
    </Shelf>
  )
}

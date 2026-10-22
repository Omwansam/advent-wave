import { useState } from 'react';

import { useFriendsStore } from '@/store/friends';
import { showToast } from '@/store/toast';
import { Button } from './Buttons';

/**
 * Following a listener. `followedByMe` is the server's answer where the caller has one (search,
 * profiles); the friends list is the fallback, and the last tap here is newer than either.
 */
export function FollowButton({
  userId,
  name,
  followedByMe,
  onChange,
}: {
  userId: string;
  name: string;
  followedByMe?: boolean;
  onChange?: (now: boolean) => void;
}) {
  const inFriends = useFriendsStore((s) => s.friends.some((f) => f.id === userId));
  const [toggled, setToggled] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const following = toggled ?? followedByMe ?? inFriends;
  return (
    <Button
      compact
      variant={following ? 'outline' : 'primary'}
      title={following ? 'Following' : 'Follow'}
      icon={following ? 'checkmark' : 'person-add'}
      loading={busy}
      onPress={async () => {
        setBusy(true);
        try {
          const now = await useFriendsStore.getState().toggleFollow(userId);
          setToggled(now);
          onChange?.(now);
          showToast(now ? `Following ${name}` : `Unfollowed ${name}`);
        } catch {
          showToast(`Could not ${following ? 'unfollow' : 'follow'} ${name}. Try again.`);
        } finally {
          setBusy(false);
        }
      }}
    />
  );
}

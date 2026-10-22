import { router } from 'expo-router';

/**
 * Where a tap goes. Detail screens are shared by every tab (src/app/(tabs)/(home,search,...)),
 * so pushing one keeps the listener in the tab they are in, with the mini player under it.
 */
export const go = {
  album: (id: string) => router.push({ pathname: '/album/[id]', params: { id } }),
  artist: (id: string) => router.push({ pathname: '/artist/[id]', params: { id } }),
  playlist: (id: string) => router.push({ pathname: '/playlist/[id]', params: { id } }),
  category: (id: string, label?: string) => router.push({ pathname: '/category/[id]', params: { id, label: label ?? '' } }),
  user: (id: string) => router.push({ pathname: '/user/[id]', params: { id } }),
  liked: () => router.push('/liked'),
  history: () => router.push('/history'),
  sermons: () => router.push('/sermons'),
  podcasts: () => router.push('/podcasts'),
  artists: () => router.push('/artists'),
  settings: () => router.push('/settings'),
  player: () => router.push('/player'),
  queue: () => router.push('/queue'),
};

/** From the full player (a modal over the tabs): close it first, then go. */
export function leavePlayer(then: () => void) {
  if (router.canDismiss()) router.dismissAll();
  setTimeout(then, 0);
}

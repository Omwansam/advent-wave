import { useMemo } from 'react'
import { create } from 'zustand'
import { listArtists, listChurches } from '../api'

/**
 * Artists and churches, cached for name lookups and pickers: media rows carry an artistId,
 * artists carry a churchId, and every table needs the names. Pages that change either list
 * call `refresh` afterwards; nothing here is written optimistically.
 */
export const useCatalogStore = create((set, get) => ({
  artists: [],
  churches: [],
  loaded: false,
  error: null,
  /** @type {Promise<void> | null} */
  inflight: null,

  /** Loads once; `force` reloads. Concurrent callers share one request. */
  load: (force = false) => {
    const state = get()
    if (state.inflight) return state.inflight
    if (state.loaded && !force) return Promise.resolve()
    const inflight = Promise.all([listArtists(), listChurches()])
      .then(([artists, churches]) => {
        set({ artists, churches, loaded: true, error: null, inflight: null })
      })
      .catch((error) => {
        set({ error, inflight: null })
      })
    set({ inflight })
    return inflight
  },

  refresh: () => get().load(true),

  reset: () => set({ artists: [], churches: [], loaded: false, error: null, inflight: null }),
}))

export function useArtistsById() {
  const artists = useCatalogStore((s) => s.artists)
  return useMemo(() => Object.fromEntries(artists.map((a) => [a.id, a])), [artists])
}

export function useChurchesById() {
  const churches = useCatalogStore((s) => s.churches)
  return useMemo(() => Object.fromEntries(churches.map((c) => [c.id, c])), [churches])
}

import { useMemo } from 'react'
import { create } from 'zustand'
import { listArtists, listChurches, listConferences } from '../api'

/**
 * Artists and churches, cached for name lookups and pickers: media rows carry an artistId,
 * artists carry a churchId, and every table needs the names. Pages that change either list
 * call `refresh` afterwards; nothing here is written optimistically.
 */
export const useCatalogStore = create((set, get) => ({
  artists: [],
  churches: [],
  /** RFC 0009: where a profile can sit in the church's structure. */
  conferences: [],
  loaded: false,
  error: null,
  /** @type {Promise<void> | null} */
  inflight: null,

  /** Loads once; `force` reloads. Concurrent callers share one request. */
  load: (force = false) => {
    const state = get()
    if (state.inflight) return state.inflight
    if (state.loaded && !force) return Promise.resolve()
    const inflight = Promise.all([listArtists(), listChurches(), listConferences()])
      .then(([artists, churches, conferences]) => {
        set({ artists, churches, conferences, loaded: true, error: null, inflight: null })
      })
      .catch((error) => {
        set({ error, inflight: null })
      })
    set({ inflight })
    return inflight
  },

  refresh: () => get().load(true),

  reset: () => set({ artists: [], churches: [], conferences: [], loaded: false, error: null, inflight: null }),
}))

export function useArtistsById() {
  const artists = useCatalogStore((s) => s.artists)
  return useMemo(() => Object.fromEntries(artists.map((a) => [a.id, a])), [artists])
}

export function useChurchesById() {
  const churches = useCatalogStore((s) => s.churches)
  return useMemo(() => Object.fromEntries(churches.map((c) => [c.id, c])), [churches])
}

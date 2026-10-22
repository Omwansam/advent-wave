import { useEffect, useState } from 'react'
import { fetchRelease, fetchSite } from './adventwave'

/**
 * The server could not be asked (offline, timed out, an error). Not the same as null, which is
 * the server saying it has nothing: a download page that cannot reach the server should still
 * offer the links, not announce that there is no release.
 */
export const UNREACHABLE = false

/**
 * One request per page load for each, shared by every component and both pages: the answers
 * change on the scale of minutes (the gateway caches the site for half an hour). A failed request
 * is forgotten, so the next page asks again.
 */
const pending = {}

function once(key, load) {
  pending[key] ??= load().catch((error) => {
    delete pending[key]
    throw error
  })
  return pending[key]
}

/** undefined while asking, null when the server has nothing to show, UNREACHABLE when it could not be asked. */
function useLive(key, load) {
  const [value, setValue] = useState(undefined)
  useEffect(() => {
    let current = true
    once(key, load)
      .then((result) => current && setValue(result))
      .catch(() => current && setValue(UNREACHABLE))
    return () => {
      current = false
    }
  }, [key, load])
  return value
}

export const useSite = () => useLive('site', fetchSite)

export const useRelease = () => useLive('release', fetchRelease)

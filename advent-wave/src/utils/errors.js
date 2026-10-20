/** The server's sentence when it gave one; otherwise say the server could not be reached. */
export function describeError(err) {
  return err?.status ? err.message : 'Could not reach AdventWave. Check your connection and try again.'
}

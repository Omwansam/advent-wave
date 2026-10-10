import { requestTranscode, requestUpload } from '../api'
import { putFile } from '../api/upload'

/**
 * Adding a recording is four server steps. Each leaves the draft in a state the media detail
 * page can resume from, so a failure part-way never loses work:
 *
 *   draft       POST /media                      → a draft exists
 *   upload-url  POST /media/{id}/upload          → a signed URL for masters/{id}/original.{ext}
 *   put         PUT {uploadUrl}                  → the master is in storage (never replaced)
 *   transcode   POST /media/{id}/transcode       → processing; the worker takes it from here
 */
export const INGEST_STEPS = [
  { id: 'draft', label: 'Create the draft' },
  { id: 'upload-url', label: 'Get an upload URL' },
  { id: 'put', label: 'Upload the master' },
  { id: 'transcode', label: 'Request the transcode' },
]

export class IngestStepError extends Error {
  constructor(step, cause) {
    super(cause?.message || 'Something went wrong')
    this.name = 'IngestStepError'
    this.step = step
    this.cause = cause
    this.status = cause?.status
  }

  get cancelled() {
    return this.cause?.name === 'AbortError'
  }
}

/* ------------------------------------------------------------------ resume record */

/*
 * Between a successful PUT and a successful transcode request, only this browser knows the
 * master's key: the item records it when the transcode is requested, not before. Kept so the
 * detail page can finish the job without asking for the file again. A convenience: losing it
 * costs one re-pick of the same file, which rebuilds the same key.
 */
const RECORD_KEY = 'adventwave-admin-ingest'

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(RECORD_KEY) || '{}') || {}
  } catch {
    return {}
  }
}

function writeAll(records) {
  try {
    localStorage.setItem(RECORD_KEY, JSON.stringify(records))
  } catch {
    // Storage blocked or full: resuming falls back to re-picking the file.
  }
}

/** @returns {{ masterStorageKey?: string, filename?: string, failedStep?: string } | null} */
export function readIngestRecord(mediaItemId) {
  return readAll()[mediaItemId] ?? null
}

export function writeIngestRecord(mediaItemId, patch) {
  const records = readAll()
  records[mediaItemId] = { ...records[mediaItemId], ...patch, at: new Date().toISOString() }
  writeAll(records)
}

export function clearIngestRecord(mediaItemId) {
  const records = readAll()
  delete records[mediaItemId]
  writeAll(records)
}

/* ------------------------------------------------------------------ steps */

/**
 * upload-url → put → transcode for an existing draft (or failed item without a master).
 *
 * @param {{ mediaItemId: string, file: File, signal?: AbortSignal,
 *           onStep?: (step: string) => void,
 *           onProgress?: (fraction: number, loaded: number, total: number) => void }} args
 * @returns {Promise<object>} The item, now processing.
 * @throws {IngestStepError}
 */
export async function uploadAndTranscode({ mediaItemId, file, signal, onStep, onProgress }) {
  const contentType = file.type || 'application/octet-stream'

  let ticket
  onStep?.('upload-url')
  try {
    ticket = await requestUpload(
      mediaItemId,
      { filename: file.name, contentType, sizeBytes: file.size },
      { signal },
    )
  } catch (error) {
    writeIngestRecord(mediaItemId, { filename: file.name, failedStep: 'upload-url' })
    throw new IngestStepError('upload-url', error)
  }

  onStep?.('put')
  try {
    await putFile(ticket.uploadUrl, file, {
      method: ticket.method || 'PUT',
      contentType,
      signal,
      onProgress,
    })
  } catch (error) {
    writeIngestRecord(mediaItemId, { filename: file.name, failedStep: 'put' })
    throw new IngestStepError('put', error)
  }

  // The master now exists and will never be replaced: remember its key before anything else.
  writeIngestRecord(mediaItemId, {
    filename: file.name,
    masterStorageKey: ticket.masterStorageKey,
    failedStep: 'transcode',
  })

  return transcodeStoredMaster({ mediaItemId, masterStorageKey: ticket.masterStorageKey, signal, onStep })
}

/** The last step alone: for a master already in storage. */
export async function transcodeStoredMaster({ mediaItemId, masterStorageKey, signal, onStep }) {
  onStep?.('transcode')
  try {
    const item = await requestTranscode(mediaItemId, masterStorageKey, { signal })
    clearIngestRecord(mediaItemId)
    return item
  } catch (error) {
    writeIngestRecord(mediaItemId, { masterStorageKey, failedStep: 'transcode' })
    throw new IngestStepError('transcode', error)
  }
}

import { describeFlag, reviewFlagsOf } from '../lib/media'
import { Notice } from './Notice'

/**
 * What a human should look at: the worker's review flags in plain words, and the failure
 * reason. Flags never block publishing; the audio rules forbid fixing them automatically.
 */
export function ReviewNotes({ item, compact = false }) {
  const flags = reviewFlagsOf(item)
  const failed = item.status === 'failed'
  if (!flags.length && !failed) return null

  return (
    <div className="space-y-2">
      {failed ? (
        <Notice tone="danger" title="Transcode failed">
          {item.failureReason ? (
            <p className="break-words">{item.failureReason}</p>
          ) : (
            <p>The server recorded no reason for this failure.</p>
          )}
        </Notice>
      ) : null}
      {flags.map((flag) => {
        const text = describeFlag(flag)
        return (
          <Notice key={flag} tone="warn" title={text.title}>
            {compact ? null : <p>{text.detail}</p>}
          </Notice>
        )
      })}
    </div>
  )
}

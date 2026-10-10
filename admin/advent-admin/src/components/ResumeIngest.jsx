import { useState } from 'react'
import { PlayCircle, Upload } from 'lucide-react'
import { useIngestRunner } from '../hooks/useIngestRunner'
import { useMasterFile } from '../hooks/useMasterFile'
import {
  INGEST_STEPS,
  readIngestRecord,
  transcodeStoredMaster,
  uploadAndTranscode,
} from '../lib/ingest'
import { LOSSY_WARNING, MASTER_ACCEPT, masterKeyFor } from '../lib/media'
import { Button } from './Button'
import { Card, CardHeader } from './Card'
import { FileDrop } from './FileDrop'
import { IngestProgress } from './IngestProgress'
import { Notice } from './Notice'

const UPLOAD_STEPS = INGEST_STEPS.filter((s) => s.id !== 'draft')
const TRANSCODE_STEPS = INGEST_STEPS.filter((s) => s.id === 'transcode')

/**
 * A draft whose ingest stopped part-way. Picks up from the step that failed: upload the master,
 * or, when it is already in storage, just request the transcode. Masters are never replaced,
 * so a refused re-upload offers to use the one that is there.
 */
export function ResumeIngest({ item, onItem }) {
  const [record] = useState(() => readIngestRecord(item.id))
  const master = useMasterFile({ detectDuration: false })
  const runner = useIngestRunner()
  const [mode, setMode] = useState(record?.masterStorageKey ? 'transcode' : 'upload')

  const storedKey =
    record?.masterStorageKey ?? (master.file && master.allowed ? masterKeyFor(item.id, master.file.name) : null)
  const masterExists = runner.state?.failed && runner.state.step === 'upload-url' && runner.state.error?.status === 409

  const upload = async () => {
    const file = master.file
    const next = await runner.run('upload-url', ({ signal, onStep, onProgress }) =>
      uploadAndTranscode({ mediaItemId: item.id, file, signal, onStep, onProgress }),
    )
    if (next) onItem(next)
  }

  const transcode = async (masterStorageKey) => {
    setMode('transcode')
    const next = await runner.run('transcode', ({ signal, onStep }) =>
      transcodeStoredMaster({ mediaItemId: item.id, masterStorageKey, signal, onStep }),
    )
    if (next) onItem(next)
  }

  const failedLabel = INGEST_STEPS.find((s) => s.id === record?.failedStep)?.label
  const failedItem = item.status === 'failed'

  return (
    <Card className="border-[var(--aw-primary)]/40">
      <CardHeader
        title={failedItem ? 'Upload a different master' : 'Finish adding this item'}
        description={
          failedItem
            ? 'Only possible while no master is stored: masters are never replaced. If the stored file is wrong, add the corrected recording as a new item.'
            : failedLabel
              ? `The last attempt stopped at “${failedLabel.toLowerCase()}”. Pick up from there.`
              : 'This draft has no master yet. Upload it to start the transcode.'
        }
      />
      <div className="space-y-3 p-4">
        {mode === 'transcode' && storedKey ? (
          <>
            <p className="text-sm">
              The master is in storage at <span className="aw-mono">{storedKey}</span>. Request the transcode to
              continue.
            </p>
            {runner.state ? <IngestProgress steps={TRANSCODE_STEPS} state={runner.state} /> : null}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="primary"
                icon={PlayCircle}
                pending={runner.running}
                disabled={runner.state?.step === 'done'}
                onClick={() => transcode(storedKey)}
              >
                Request transcode
              </Button>
              {!record?.masterStorageKey ? (
                <Button onClick={() => { runner.reset(); setMode('upload') }}>Back</Button>
              ) : null}
            </div>
          </>
        ) : (
          <>
            <FileDrop
              file={master.file}
              onFile={(file) => {
                runner.reset()
                master.pick(file)
              }}
              accept={MASTER_ACCEPT}
              disabled={runner.running}
              hint={record?.filename ? `Last time: ${record.filename}` : 'WAV or FLAC preferred.'}
            />
            {master.extensionError ? <Notice tone="danger">{master.extensionError}</Notice> : null}
            {master.file && master.allowed && master.lossy ? <Notice tone="warn">{LOSSY_WARNING}</Notice> : null}
            {runner.state ? <IngestProgress steps={UPLOAD_STEPS} state={runner.state} onCancel={runner.cancel} /> : null}
            {runner.state?.failed && runner.state.step === 'transcode' && storedKey ? (
              <Button size="sm" onClick={() => transcode(storedKey)}>
                The master uploaded; retry the transcode request
              </Button>
            ) : null}
            {masterExists && storedKey ? (
              <Notice tone="info" title="A master is already stored for this item">
                <p>Masters are never replaced. If it is this same file, use it:</p>
                <Button size="sm" variant="primary" className="mt-2" onClick={() => transcode(storedKey)}>
                  Transcode {storedKey.split('/').pop()}
                </Button>
              </Notice>
            ) : null}
            <Button
              variant="primary"
              icon={Upload}
              pending={runner.running}
              disabled={!master.file || !master.allowed}
              onClick={upload}
            >
              Upload and transcode
            </Button>
          </>
        )}
      </div>
    </Card>
  )
}

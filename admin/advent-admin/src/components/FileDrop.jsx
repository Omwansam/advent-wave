import { useId, useState } from 'react'
import { FileAudio, UploadCloud } from 'lucide-react'
import { formatBytes } from '../lib/format'

/** Pick or drop one file. The parent validates it; this only hands it over. */
export function FileDrop({ file, onFile, accept, disabled = false, hint }) {
  const id = useId()
  const [over, setOver] = useState(false)

  const take = (files) => {
    const next = files?.[0]
    if (next) onFile(next)
  }

  return (
    <label
      htmlFor={id}
      onDragOver={(e) => {
        e.preventDefault()
        if (!disabled) setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        if (!disabled) take(e.dataTransfer.files)
      }}
      className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition ${
        over
          ? 'border-[var(--aw-primary)] bg-[var(--aw-primary)]/8'
          : 'border-[var(--aw-border)] hover:border-[var(--aw-primary)]/50 hover:bg-[var(--aw-card-hover)]'
      } ${disabled ? 'pointer-events-none opacity-60' : ''}`}
    >
      <input
        id={id}
        type="file"
        accept={accept}
        className="sr-only"
        disabled={disabled}
        onChange={(e) => {
          take(e.target.files)
          e.target.value = ''
        }}
      />
      {file ? (
        <>
          <FileAudio className="size-7 text-[var(--aw-primary)]" aria-hidden />
          <p className="max-w-full truncate text-sm font-semibold">{file.name}</p>
          <p className="text-xs text-[var(--aw-muted)]">
            {formatBytes(file.size)}
            {file.type ? ` · ${file.type}` : ''} · click or drop to replace
          </p>
        </>
      ) : (
        <>
          <UploadCloud className="size-7 text-[var(--aw-muted)]" aria-hidden />
          <p className="text-sm font-semibold">Drop the master here, or click to choose</p>
          {hint ? <p className="text-xs text-[var(--aw-muted)]">{hint}</p> : null}
        </>
      )}
    </label>
  )
}

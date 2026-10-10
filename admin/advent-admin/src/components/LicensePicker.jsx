import { ConsentChip } from './Chip'
import { formatDate } from '../lib/format'
import { licenseExpiry } from '../lib/license'

/**
 * A radio list of one church's licences. Any licence can be chosen; only a granted, unexpired
 * one lets the item publish, and the database trigger enforces that whatever is chosen here.
 */
export function LicensePicker({ licenses, value, onChange, name = 'license' }) {
  return (
    <ul className="divide-y divide-[var(--aw-border)] overflow-hidden rounded-xl border border-[var(--aw-border)]">
      {licenses.map((license) => {
        const expiry = licenseExpiry(license)
        return (
          <li key={license.id}>
            <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-[var(--aw-card-hover)]">
              <input
                type="radio"
                name={name}
                value={license.id}
                checked={value === license.id}
                onChange={() => onChange(license.id)}
                className="accent-[var(--aw-primary)]"
              />
              <ConsentChip status={license.consentStatus} />
              <span className="min-w-0 flex-1 truncate text-sm">
                {license.territory || 'No territory'}
                <span className="aw-mono ml-2 text-[var(--aw-muted)]">{license.id.slice(0, 8)}</span>
              </span>
              <span className={`whitespace-nowrap text-xs ${expiry.expired ? 'text-[var(--aw-danger)]' : 'text-[var(--aw-muted)]'}`}>
                {license.expiresAt ? `${expiry.expired ? 'Expired' : 'Expires'} ${formatDate(license.expiresAt)}` : 'No expiry'}
              </span>
            </label>
          </li>
        )
      })}
    </ul>
  )
}

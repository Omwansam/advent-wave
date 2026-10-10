import { useCallback, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BadgeCheck, Pencil, Plus } from 'lucide-react'
import { getChurch, listChurchLicenses, setChurchConsent, setLicenseStatus } from '../api'
import { Button } from '../components/Button'
import { Card, CardHeader, DefinitionList, TableWrap } from '../components/Card'
import { ConsentChip } from '../components/Chip'
import { FilterSelect } from '../components/Field'
import { ArtistForm } from '../components/forms/ArtistForm'
import { ChurchForm } from '../components/forms/ChurchForm'
import { LicenseForm } from '../components/forms/LicenseForm'
import { InlineError } from '../components/Notice'
import { PageHeader } from '../components/PageHeader'
import { AsyncBody, LoadError, Loading } from '../components/PageState'
import { useAction } from '../hooks/useAction'
import { useAsync } from '../hooks/useAsync'
import { formatDate, formatDateTime } from '../lib/format'
import { licenseExpiry } from '../lib/license'
import { CHURCH_CONSENT_STATUSES, LICENSE_STATUSES } from '../lib/media'
import { PERMISSIONS } from '../lib/roles'
import { useCan } from '../store/useAuthStore'
import { useCatalogStore } from '../store/useCatalogStore'

export function ChurchDetail() {
  const { id } = useParams()
  const loadChurch = useCallback((signal) => getChurch(id, { signal }), [id])
  const church = useAsync(loadChurch)
  const loadLicenses = useCallback((signal) => listChurchLicenses(id, { signal }), [id])
  const licenses = useAsync(loadLicenses)
  const artists = useCatalogStore((s) => s.artists)
  const refreshCatalog = useCatalogStore((s) => s.refresh)
  const consent = useAction()
  const [editing, setEditing] = useState(false)
  const [addingLicense, setAddingLicense] = useState(false)
  const [addingArtist, setAddingArtist] = useState(false)
  const canEditRights = useCan(PERMISSIONS.RIGHTS_WRITE)
  const canEditMedia = useCan(PERMISSIONS.MEDIA_WRITE)

  if (church.loading) return <Loading />
  if (!church.data) return <LoadError error={church.error} onRetry={church.reload} />

  const c = church.data
  const churchArtists = artists.filter((a) => a.churchId === id)

  const changeConsent = (status) =>
    consent.run(async () => {
      church.mutate(await setChurchConsent(id, status))
      refreshCatalog()
    })

  return (
    <>
      <PageHeader
        back={{ to: '/churches', label: 'Churches' }}
        title={c.name}
        meta={<ConsentChip status={c.consentStatus} />}
        actions={
          canEditRights ? (
            <Button icon={Pencil} onClick={() => setEditing(true)}>
              Edit
            </Button>
          ) : null
        }
      />

      <div className="grid grid-cols-1 gap-5">
        <Card>
          <CardHeader
            title="Church"
            description="Consent is the church's agreement to take part. A licence's own status is what gates publication."
            actions={
              canEditRights ? (
                <>
                  <span className="text-xs text-[var(--aw-muted)]">Consent</span>
                  <FilterSelect
                    label="Church consent"
                    value={c.consentStatus}
                    onChange={changeConsent}
                    options={CHURCH_CONSENT_STATUSES.map((s) => ({ value: s, label: s }))}
                  />
                </>
              ) : null
            }
          />
          <InlineError error={consent.error} className="px-4 pt-3" />
          <DefinitionList
            items={[
              ['Country', c.country],
              ['Region', c.region],
              ['Contact email', c.contactEmail],
              ['Created', formatDateTime(c.createdAt)],
              ['Id', <span key="id" className="aw-mono">{c.id}</span>],
            ]}
          />
        </Card>

        <Card>
          <CardHeader
            title="Licences"
            description="An item can publish only while its licence is granted and unexpired. The database enforces it."
            actions={
              canEditRights ? (
                <Button size="sm" variant="primary" icon={Plus} onClick={() => setAddingLicense(true)}>
                  New licence
                </Button>
              ) : null
            }
          />
          <AsyncBody state={licenses} isEmpty={(list) => !list.length} empty="No licences yet.">
            {(list) => (
              <TableWrap>
                <table className="aw-table">
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Territory</th>
                      <th>Revenue share</th>
                      <th>Granted</th>
                      <th>Expiry</th>
                      <th>Consent document</th>
                      {canEditRights ? <th>Change status</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((license) => (
                      <LicenseRow
                        key={license.id}
                        license={license}
                        canEdit={canEditRights}
                        onChanged={(next) => licenses.mutate((all) => all.map((l) => (l.id === next.id ? next : l)))}
                      />
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            )}
          </AsyncBody>
        </Card>

        <Card>
          <CardHeader
            title="Artists"
            description="Their recordings can use this church's licences."
            actions={
              canEditMedia ? (
                <Button size="sm" icon={Plus} onClick={() => setAddingArtist(true)}>
                  New artist
                </Button>
              ) : null
            }
          />
          {churchArtists.length ? (
            <ul className="divide-y divide-[var(--aw-border)]">
              {churchArtists.map((a) => (
                <li key={a.id}>
                  <Link
                    to={`/artists/${a.id}`}
                    className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-[var(--aw-card-hover)]"
                  >
                    <span className="font-medium">{a.name}</span>
                    {a.verified ? <BadgeCheck className="size-4 text-[var(--aw-primary)]" aria-label="Verified" /> : null}
                    <span className="aw-mono text-[var(--aw-muted)]">{a.slug}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-6 text-sm text-[var(--aw-muted)]">No artists belong to this church yet.</p>
          )}
        </Card>
      </div>

      {editing ? (
        <ChurchForm
          church={c}
          onClose={() => setEditing(false)}
          onSaved={(saved) => {
            setEditing(false)
            church.mutate(saved)
            refreshCatalog()
          }}
        />
      ) : null}
      {addingLicense ? (
        <LicenseForm
          churchId={id}
          onClose={() => setAddingLicense(false)}
          onSaved={() => {
            setAddingLicense(false)
            licenses.reload()
          }}
        />
      ) : null}
      {addingArtist ? (
        <ArtistForm
          defaultChurchId={id}
          onClose={() => setAddingArtist(false)}
          onSaved={() => setAddingArtist(false)}
        />
      ) : null}
    </>
  )
}

function LicenseRow({ license, canEdit, onChanged }) {
  const action = useAction()
  const expiry = licenseExpiry(license)

  const change = (status) =>
    action.run(async () => {
      onChanged(await setLicenseStatus(license.id, status))
    })

  return (
    <>
      <tr>
        <td>
          <ConsentChip status={license.consentStatus} />
        </td>
        <td>
          {license.territory ?? '—'}
          <div className="aw-mono text-[var(--aw-muted)]">{license.id.slice(0, 8)}</div>
        </td>
        <td className="tabular-nums">{license.revenueSharePct != null ? `${license.revenueSharePct}%` : '—'}</td>
        <td className="whitespace-nowrap text-[var(--aw-muted)]">{formatDate(license.grantedAt)}</td>
        <td className="whitespace-nowrap">
          {license.expiresAt ? (
            <span
              className={
                expiry.expired
                  ? 'font-semibold text-[var(--aw-danger)]'
                  : expiry.soon
                    ? 'font-semibold text-[var(--aw-warn)]'
                    : 'text-[var(--aw-muted)]'
              }
              title={license.expiresAt}
            >
              {formatDate(license.expiresAt)}
              {expiry.expired ? ' · expired' : expiry.soon ? ` · ${expiry.daysLeft} days left` : ''}
            </span>
          ) : (
            <span className="text-[var(--aw-muted)]">No expiry</span>
          )}
        </td>
        <td className="max-w-[14rem] truncate">
          {license.consentDocumentUrl ? (
            <a href={license.consentDocumentUrl} target="_blank" rel="noreferrer" className="text-[var(--aw-primary)] hover:underline">
              Open
            </a>
          ) : (
            <span className="text-[var(--aw-muted)]">—</span>
          )}
        </td>
        {canEdit ? (
          <td>
            <FilterSelect
              label="Licence status"
              value={license.consentStatus}
              onChange={change}
              options={LICENSE_STATUSES.map((s) => ({ value: s, label: s }))}
            />
          </td>
        ) : null}
      </tr>
      {action.error ? (
        <tr>
          <td colSpan={7}>
            <InlineError error={action.error} />
          </td>
        </tr>
      ) : null}
    </>
  )
}

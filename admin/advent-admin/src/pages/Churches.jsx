import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { listChurches } from '../api'
import { Button } from '../components/Button'
import { Card, TableWrap } from '../components/Card'
import { ConsentChip } from '../components/Chip'
import { SearchInput } from '../components/Field'
import { ChurchForm } from '../components/forms/ChurchForm'
import { PageHeader } from '../components/PageHeader'
import { AsyncBody } from '../components/PageState'
import { useAsync } from '../hooks/useAsync'
import { formatDate } from '../lib/format'
import { PERMISSIONS } from '../lib/roles'
import { useCan } from '../store/useAuthStore'
import { useCatalogStore } from '../store/useCatalogStore'

export function Churches() {
  const navigate = useNavigate()
  const load = useCallback((signal) => listChurches({ signal }), [])
  const churches = useAsync(load)
  const refreshCatalog = useCatalogStore((s) => s.refresh)
  const [creating, setCreating] = useState(false)
  const [q, setQ] = useState('')
  const canEditRights = useCan(PERMISSIONS.RIGHTS_WRITE)

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const list = churches.data ?? []
    if (!needle) return list
    return list.filter((c) =>
      [c.name, c.country, c.region, c.contactEmail].some((v) => v?.toLowerCase().includes(needle)),
    )
  }, [churches.data, q])

  return (
    <>
      <PageHeader
        title="Churches"
        description="Contributing churches, their consent to take part, and the licences that let their recordings publish."
        actions={
          canEditRights ? (
            <Button variant="primary" icon={Plus} onClick={() => setCreating(true)}>
              New church
            </Button>
          ) : null
        }
      />

      <Card>
        <div className="border-b border-[var(--aw-border)] px-4 py-3">
          <SearchInput value={q} onChange={setQ} placeholder="Search churches" className="max-w-xs" />
        </div>
        <AsyncBody
          state={churches}
          isEmpty={() => !filtered.length}
          empty={q ? 'No church matches that search.' : 'No churches yet. Create the first one.'}
        >
          {() => (
            <TableWrap>
              <table className="aw-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Country</th>
                    <th>Region</th>
                    <th>Contact</th>
                    <th>Consent</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr
                      key={c.id}
                      className="aw-row-link"
                      tabIndex={0}
                      onClick={() => navigate(`/churches/${c.id}`)}
                      onKeyDown={(e) => e.key === 'Enter' && navigate(`/churches/${c.id}`)}
                    >
                      <td className="font-medium">{c.name}</td>
                      <td className="text-[var(--aw-muted)]">{c.country ?? '—'}</td>
                      <td className="text-[var(--aw-muted)]">{c.region ?? '—'}</td>
                      <td className="text-[var(--aw-muted)]">{c.contactEmail ?? '—'}</td>
                      <td>
                        <ConsentChip status={c.consentStatus} />
                      </td>
                      <td className="whitespace-nowrap text-[var(--aw-muted)]">{formatDate(c.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}
        </AsyncBody>
      </Card>

      {creating ? (
        <ChurchForm
          onClose={() => setCreating(false)}
          onSaved={(church) => {
            setCreating(false)
            refreshCatalog()
            navigate(`/churches/${church.id}`)
          }}
        />
      ) : null}
    </>
  )
}

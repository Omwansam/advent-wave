import { ButtonLink } from '../components/Button'
import { PageHeader } from '../components/PageHeader'

export function NotFound() {
  return (
    <>
      <PageHeader title="Not found" description="There is no admin page at this address." />
      <ButtonLink to="/" variant="primary">
        Go to the dashboard
      </ButtonLink>
    </>
  )
}

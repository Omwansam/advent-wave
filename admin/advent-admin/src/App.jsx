import { useEffect } from 'react'
import { Route, Routes } from 'react-router-dom'
import { AdminLayout } from './layouts/AdminLayout'
import { RequireAdmin } from './components/RequireAdmin'
import { PERMISSIONS } from './lib/roles'
import { useUiStore } from './store/useUiStore'
import { SignIn } from './pages/SignIn'
import { ForcedPasswordChange } from './pages/ForcedPasswordChange'
import { Dashboard } from './pages/Dashboard'
import { Churches } from './pages/Churches'
import { ChurchDetail } from './pages/ChurchDetail'
import { Artists } from './pages/Artists'
import { ArtistDetail } from './pages/ArtistDetail'
import { MediaLibrary } from './pages/MediaLibrary'
import { AddMedia } from './pages/AddMedia'
import { MediaDetail } from './pages/MediaDetail'
import { ReviewQueue } from './pages/ReviewQueue'
import { Account } from './pages/Account'
import { Accounts } from './pages/Accounts'
import { NotFound } from './pages/NotFound'

export default function App() {
  const theme = useUiStore((s) => s.theme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  return (
    <Routes>
      <Route path="/sign-in" element={<SignIn />} />
      <Route
        path="/account/password"
        element={
          <RequireAdmin allowPendingPassword>
            <ForcedPasswordChange />
          </RequireAdmin>
        }
      />
      <Route
        element={
          <RequireAdmin>
            <AdminLayout />
          </RequireAdmin>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="churches" element={<Churches />} />
        <Route path="churches/:id" element={<ChurchDetail />} />
        <Route path="artists" element={<Artists />} />
        <Route path="artists/:id" element={<ArtistDetail />} />
        <Route path="media" element={<MediaLibrary />} />
        <Route
          path="media/new"
          element={
            <RequireAdmin permission={PERMISSIONS.MEDIA_WRITE}>
              <AddMedia />
            </RequireAdmin>
          }
        />
        <Route path="media/:id" element={<MediaDetail />} />
        <Route path="review" element={<ReviewQueue />} />
        <Route path="account" element={<Account />} />
        <Route
          path="accounts"
          element={
            <RequireAdmin permission={PERMISSIONS.ADMINS_MANAGE}>
              <Accounts />
            </RequireAdmin>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

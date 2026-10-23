import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './layouts/AppLayout'
import { Home } from './pages/Home'
import { Discover } from './pages/Discover'
import { Choirs } from './pages/Choirs'
import { Library } from './pages/Library'
import { PlaylistDetail } from './pages/PlaylistDetail'
import { Podcasts } from './pages/Podcasts'
import { Sermons } from './pages/Sermons'
import { Search } from './pages/Search'
import { LikedSongs } from './pages/LikedSongs'
import { AlbumDetail } from './pages/AlbumDetail'
import { ArtistDetail } from './pages/ArtistDetail'
import { Browse } from './pages/Browse'
import { Settings } from './pages/Settings'
import { ListeningHistory } from './pages/ListeningHistory'
import { FollowedArtists } from './pages/FollowedArtists'
import { FriendsPage } from './pages/FriendsPage'
import { UserProfile } from './pages/UserProfile'
import { LoginPage } from './pages/LoginPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { VerifyEmailPage } from './pages/VerifyEmailPage'
import { DownloadPage } from './pages/DownloadPage'
import { SplashScreen } from './components/SplashScreen'
import { RequireAuth } from './components/RequireAuth'
import { onUnauthorized } from './api/token'
import { useAuthStore } from './store/useAuthStore'

const SPLASH_MS = 2200

export default function App() {
  const [showSplash, setShowSplash] = useState(true)

  useEffect(() => {
    const id = window.setTimeout(() => setShowSplash(false), SPLASH_MS)
    return () => window.clearTimeout(id)
  }, [])

  // A 401 from any request means the token is dead. End the session once, centrally, rather
  // than letting each page discover it and render its own error.
  useEffect(
    () => onUnauthorized(() => useAuthStore.getState().logout()),
    [],
  )

  if (showSplash) {
    return <SplashScreen />
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        {/* Emailed links (RFC 0005): open signed in or not. */}
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/download" element={<DownloadPage />} />
        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route index element={<Home />} />
            <Route path="search" element={<Search />} />
            <Route path="browse" element={<Browse />} />
            <Route path="discover" element={<Discover />} />
            <Route path="choirs" element={<Choirs />} />
            <Route path="settings" element={<Settings />} />
            <Route path="history" element={<ListeningHistory />} />
            <Route path="artists" element={<FollowedArtists />} />
            <Route path="library" element={<Library />} />
            <Route path="liked" element={<LikedSongs />} />
            <Route path="album/:id" element={<AlbumDetail />} />
            <Route path="artist/:id" element={<ArtistDetail />} />
            <Route path="friends" element={<FriendsPage />} />
            <Route path="user/:id" element={<UserProfile />} />
            <Route path="podcasts" element={<Podcasts />} />
            <Route path="sermons" element={<Sermons />} />
            <Route path="playlist/:id" element={<PlaylistDetail />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

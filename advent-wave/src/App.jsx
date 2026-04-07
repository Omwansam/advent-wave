import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './layouts/AppLayout'
import { Home } from './pages/Home'
import { Discover } from './pages/Discover'
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
import { LoginPage } from './pages/LoginPage'
import { SplashScreen } from './components/SplashScreen'
import { RequireAuth } from './components/RequireAuth'

const SPLASH_MS = 2200

export default function App() {
  const [showSplash, setShowSplash] = useState(true)

  useEffect(() => {
    const id = window.setTimeout(() => setShowSplash(false), SPLASH_MS)
    return () => window.clearTimeout(id)
  }, [])

  if (showSplash) {
    return <SplashScreen />
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route index element={<Home />} />
            <Route path="search" element={<Search />} />
            <Route path="browse" element={<Browse />} />
            <Route path="discover" element={<Discover />} />
            <Route path="settings" element={<Settings />} />
            <Route path="history" element={<ListeningHistory />} />
            <Route path="artists" element={<FollowedArtists />} />
            <Route path="library" element={<Library />} />
            <Route path="liked" element={<LikedSongs />} />
            <Route path="album/:id" element={<AlbumDetail />} />
            <Route path="artist/:name" element={<ArtistDetail />} />
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

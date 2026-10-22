import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { DownloadPage } from './pages/DownloadPage'
import { HomePage } from './pages/HomePage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="download" element={<DownloadPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

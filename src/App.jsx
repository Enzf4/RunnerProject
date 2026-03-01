import { Routes, Route } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { AuthGuard } from './components/AuthGuard'
import { AuthPage } from './pages/AuthPage'
import { HomePage } from './pages/HomePage'
import { ProfilePage } from './pages/ProfilePage'
import { CreateClubPage } from './pages/CreateClubPage'
import { ClubDetailsPage } from './pages/ClubDetailsPage'
import { ClubsPage } from './pages/ClubsPage'

function App() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route element={
        <AuthGuard>
          <AppLayout />
        </AuthGuard>
      }>
        <Route path="/" element={<HomePage />} />
        <Route path="/clubs" element={<ClubsPage />} />
        <Route path="/clubs/new" element={<CreateClubPage />} />
        <Route path="/clubs/:id" element={<ClubDetailsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>
    </Routes>
  )
}

export default App

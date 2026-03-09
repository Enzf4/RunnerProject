import { Routes, Route } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { AuthGuard } from './components/AuthGuard'
import { AuthPage } from './pages/AuthPage'
import { HomePage } from './pages/HomePage'
import { ProfilePage } from './pages/ProfilePage'
import { CreateClubPage } from './pages/CreateClubPage'
import { ClubDetailsPage } from './pages/ClubDetailsPage'
import { ClubsPage } from './pages/ClubsPage'
import { RunnersPage } from './pages/RunnersPage'
import { RunnerProfilePage } from './pages/RunnerProfilePage'
import { StravaSucessoPage } from './pages/StravaSucessoPage'
import { ChallengesPage } from './pages/ChallengesPage'
import { CreateChallengePage } from './pages/CreateChallengePage'
import { RewardsPage } from './pages/RewardsPage'
import { CreateRewardPage } from './pages/CreateRewardPage'

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
        <Route path="/clubs/:id/challenges" element={<ChallengesPage />} />
        <Route path="/clubs/:id/challenges/new" element={<CreateChallengePage />} />
        <Route path="/clubs/:id/rewards" element={<RewardsPage />} />
        <Route path="/clubs/:id/rewards/new" element={<CreateRewardPage />} />
        <Route path="/runners" element={<RunnersPage />} />
        <Route path="/runners/:id" element={<RunnerProfilePage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/strava-sucesso" element={<StravaSucessoPage />} />
      </Route>
    </Routes>
  )
}

export default App

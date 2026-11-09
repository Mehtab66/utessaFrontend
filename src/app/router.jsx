import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '../shared/auth/AuthContext'
import LandingPage from '../features/landing/LandingPage'
import SignupPage from '../features/auth/SignupPage'
import VerifyPage from '../features/auth/VerifyPage'
import LoginPage from '../features/auth/LoginPage'
import WelcomePage from '../features/onboarding/WelcomePage'
import AppShell from './AppShell'
import HomePage from '../features/dashboard/HomePage'
import CrmPage from '../features/crm/CrmPage'
import OperationsPage from '../features/operations/OperationsPage'
import MarketingPage from '../features/marketing/MarketingPage'
import TimeClockPage from '../features/timeclock/TimeClockPage'

export default function AppRouter() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/verify" element={<VerifyPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/welcome" element={<WelcomePage />} />
          <Route path="/app" element={<AppShell />}>
            <Route index element={<HomePage />} />
            <Route path="crm" element={<CrmPage />} />
            <Route path="operations" element={<OperationsPage />} />
            <Route path="marketing" element={<MarketingPage />} />
            <Route path="timeclock" element={<TimeClockPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '../shared/auth/AuthContext'
import LandingPage from '../features/landing/LandingPage'
import SignupPage from '../features/auth/SignupPage'
import VerifyPage from '../features/auth/VerifyPage'
import LoginPage from '../features/auth/LoginPage'
import WelcomePage from '../features/onboarding/WelcomePage'
import AppShell from './AppShell'
import HomePage from '../features/dashboard/HomePage'
import InboxPage from '../features/dashboard/InboxPage'
import CrmPage from '../features/crm/CrmPage'
import OperationsPage from '../features/operations/OperationsPage'
import ProvidersPage from '../features/operations/ProvidersPage'
import StaffPage from '../features/operations/StaffPage'
import VendorsPage from '../features/operations/VendorsPage'
import MarketingPage from '../features/marketing/MarketingPage'
import TimeClockPage from '../features/timeclock/TimeClockPage'
import PlatformShell from '../features/platform/PlatformShell'
import PlatformHome from '../features/platform/PlatformHome'

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
          <Route path="/platform" element={<PlatformShell />}>
            <Route index element={<PlatformHome />} />
          </Route>
          <Route path="/app" element={<AppShell />}>
            <Route index element={<HomePage />} />
            <Route path="inbox" element={<InboxPage />} />
            <Route path="providers" element={<ProvidersPage />} />
            <Route path="staff" element={<StaffPage />} />
            <Route path="vendors" element={<VendorsPage />} />
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

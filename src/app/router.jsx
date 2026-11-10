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
import ProvidersPage from '../features/operations/ProvidersPage'
import StaffPage from '../features/operations/StaffPage'
import VendorsPage from '../features/operations/VendorsPage'
import ComingSoonPage from '../features/modules/ComingSoonPage'
import PlatformShell from '../features/platform/PlatformShell'
import PlatformHome from '../features/platform/PlatformHome'
import TasksPage from '../features/platform/TasksPage'
import OrganizationsPage from '../features/platform/OrganizationsPage'
import AccessPage from '../features/platform/AccessPage'
import SignupsPage from '../features/platform/SignupsPage'
import PricingPage from '../features/platform/PricingPage'
import FlagsPage from '../features/platform/FlagsPage'
import PlatformStaffPage from '../features/platform/StaffPage'
import AuditPage from '../features/platform/AuditPage'
import LoginsPage from '../features/platform/LoginsPage'

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
            <Route path="tasks" element={<TasksPage />} />
            <Route path="organizations" element={<OrganizationsPage />} />
            <Route path="access" element={<AccessPage />} />
            <Route path="signups" element={<SignupsPage />} />
            <Route path="pricing" element={<PricingPage />} />
            <Route path="flags" element={<FlagsPage />} />
            <Route path="staff" element={<PlatformStaffPage />} />
            <Route path="audit" element={<AuditPage />} />
            <Route path="logins" element={<LoginsPage />} />
          </Route>
          <Route path="/app" element={<AppShell />}>
            <Route index element={<HomePage />} />
            <Route path="inbox" element={<InboxPage />} />
            <Route path="providers" element={<ProvidersPage />} />
            <Route path="staff" element={<StaffPage />} />
            <Route path="vendors" element={<VendorsPage />} />
            <Route path="crm" element={<CrmPage />} />
            <Route path="document-vault" element={<ComingSoonPage />} />
            <Route path="resources" element={<ComingSoonPage />} />
            <Route path="training" element={<ComingSoonPage />} />
            <Route path="inventory" element={<ComingSoonPage />} />
            <Route path="no-shows" element={<ComingSoonPage />} />
            <Route path="phone" element={<ComingSoonPage />} />
            <Route path="voip" element={<ComingSoonPage />} />
            <Route path="email-domains" element={<ComingSoonPage />} />
            <Route path="mobile" element={<ComingSoonPage />} />
            <Route path="brand" element={<ComingSoonPage />} />
            <Route path="plans-access" element={<ComingSoonPage />} />
            <Route path="provider-leads" element={<ComingSoonPage />} />
            <Route path="cms-search" element={<ComingSoonPage />} />
            <Route path="email-campaigns" element={<ComingSoonPage />} />
            <Route path="social" element={<ComingSoonPage />} />
            <Route path="marketing" element={<ComingSoonPage />} />
            <Route path="agents" element={<ComingSoonPage />} />
            <Route path="setup" element={<ComingSoonPage />} />
            <Route path="operations" element={<ComingSoonPage />} />
            <Route path="timeclock" element={<ComingSoonPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

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
import OrganizationDetailPage from '../features/platform/OrganizationDetailPage'
import AccessPage from '../features/platform/AccessPage'
import SignupsPage from '../features/platform/SignupsPage'
import PricingPage from '../features/platform/PricingPage'
import FlagsPage from '../features/platform/FlagsPage'
import PlatformStaffPage from '../features/platform/StaffPage'
import AuditPage from '../features/platform/AuditPage'
import LoginsPage from '../features/platform/LoginsPage'
import { serviceAllowed } from '../shared/security/roles'
import { useAuth } from '../shared/auth/AuthContext'
import PracticeSetupPage from '../features/modules/PracticeSetupPage'

function FeatureRoute({ permission, element }) {
  const { user } = useAuth()
  if (!serviceAllowed(user?.enabledServices, permission)) {
    return <Navigate to="/app" replace />
  }
  return element
}

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
            <Route path="organizations/:id" element={<OrganizationDetailPage />} />
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
            <Route path="providers" element={<FeatureRoute permission="creds" element={<ProvidersPage />} />} />
            <Route path="staff" element={<FeatureRoute permission="staff" element={<StaffPage />} />} />
            <Route path="vendors" element={<FeatureRoute permission="vendors" element={<VendorsPage />} />} />
            <Route path="crm" element={<FeatureRoute permission="patients" element={<CrmPage />} />} />
            <Route path="document-vault" element={<FeatureRoute permission="docvault" element={<ComingSoonPage />} />} />
            <Route path="resources" element={<FeatureRoute permission="resources" element={<ComingSoonPage />} />} />
            <Route path="training" element={<FeatureRoute permission="training" element={<ComingSoonPage />} />} />
            <Route path="inventory" element={<FeatureRoute permission="inventory" element={<ComingSoonPage />} />} />
            <Route path="no-shows" element={<FeatureRoute permission="noshows" element={<ComingSoonPage />} />} />
            <Route path="phone" element={<FeatureRoute permission="voip" element={<ComingSoonPage />} />} />
            <Route path="voip" element={<FeatureRoute permission="voip" element={<ComingSoonPage />} />} />
            <Route path="email-domains" element={<FeatureRoute permission="mail" element={<ComingSoonPage />} />} />
            <Route path="mobile" element={<FeatureRoute permission="mobile" element={<ComingSoonPage />} />} />
            <Route path="brand" element={<FeatureRoute permission="brand" element={<ComingSoonPage />} />} />
            <Route path="plans-access" element={<FeatureRoute permission="access" element={<ComingSoonPage />} />} />
            <Route path="provider-leads" element={<FeatureRoute permission="leads" element={<ComingSoonPage />} />} />
            <Route path="cms-search" element={<FeatureRoute permission="cms" element={<ComingSoonPage />} />} />
            <Route path="email-campaigns" element={<FeatureRoute permission="email" element={<ComingSoonPage />} />} />
            <Route path="social" element={<FeatureRoute permission="social" element={<ComingSoonPage />} />} />
            <Route path="marketing" element={<FeatureRoute permission="mkt" element={<ComingSoonPage />} />} />
            <Route path="agents" element={<FeatureRoute permission="agents" element={<ComingSoonPage />} />} />
            <Route path="setup" element={<FeatureRoute permission="setup" element={<PracticeSetupPage />} />} />
            <Route path="operations" element={<FeatureRoute permission="ops" element={<ComingSoonPage />} />} />
            <Route path="timeclock" element={<FeatureRoute permission="timeclock" element={<ComingSoonPage />} />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

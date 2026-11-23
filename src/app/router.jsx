import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '../shared/auth/AuthContext'
import SignupPage from '../features/auth/SignupPage'
import VerifyPage from '../features/auth/VerifyPage'
import LoginPage from '../features/auth/LoginPage'
import WelcomePage from '../features/onboarding/WelcomePage'
import AppShell from './AppShell'
import HomePage from '../features/dashboard/HomePage'
import InboxPage from '../features/dashboard/InboxPage'
import CrmDashboardPage from '../features/crm/CrmDashboardPage'
import CallDeskPage from '../features/crm/CallDeskPage'
import PatientListPage from '../features/crm/PatientListPage'
import PatientDetailPage from '../features/crm/PatientDetailPage'
import ReferralsPage from '../features/crm/ReferralsPage'
import OpportunitiesPage, { OpportunityDetailPage } from '../features/crm/OpportunitiesPage'
import AppointmentsPage from '../features/crm/AppointmentsPage'
import CrmTasksPage from '../features/crm/TasksPage'
import TargetsPage from '../features/crm/TargetsPage'
import IntegrationsPage from '../features/crm/IntegrationsPage'
import RecallsPage from '../features/crm/RecallsPage'
import CallAnalyticsPage from '../features/crm/CallAnalyticsPage'
import PhonePage from '../features/crm/PhonePage'
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
import MyWorkPage from '../features/workspace/MyWorkPage'
import CalendarPage from '../features/workspace/CalendarPage'
import NotesPage from '../features/workspace/NotesPage'
import TeamBoardPage from '../features/workspace/TeamBoardPage'
import TeamPage from '../features/workspace/TeamPage'
import ModulesPage from '../features/workspace/ModulesPage'
import BillingPage from '../features/billing/BillingPage'

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
          <Route path="/" element={<Navigate to="/signup" replace />} />
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
            {/* Always-on workspace — available whatever modules the practice picked */}
            <Route path="my-work" element={<MyWorkPage />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="notes" element={<NotesPage />} />
            <Route path="board" element={<TeamBoardPage />} />
            <Route path="team" element={<TeamPage />} />
            <Route path="modules" element={<ModulesPage />} />
            <Route path="billing" element={<BillingPage />} />
            <Route path="providers" element={<FeatureRoute permission="creds" element={<ProvidersPage />} />} />
            <Route path="staff" element={<FeatureRoute permission="staff" element={<StaffPage />} />} />
            <Route path="vendors" element={<FeatureRoute permission="vendors" element={<VendorsPage />} />} />
            <Route path="crm" element={<FeatureRoute permission="patients" element={<CrmDashboardPage />} />} />
            <Route path="crm/call-desk" element={<FeatureRoute permission="patients" element={<CallDeskPage />} />} />
            <Route path="crm/leads" element={<FeatureRoute permission="patients" element={<PatientListPage key="leads" mode="LEAD" />} />} />
            <Route path="crm/patients" element={<FeatureRoute permission="patients" element={<PatientListPage key="patients" mode="PATIENT" />} />} />
            <Route path="crm/patients/:id" element={<FeatureRoute permission="patients" element={<PatientDetailPage />} />} />
            <Route path="crm/referrals" element={<FeatureRoute permission="patients" element={<ReferralsPage />} />} />
            <Route path="crm/opportunities" element={<FeatureRoute permission="patients" element={<OpportunitiesPage />} />} />
            <Route path="crm/opportunities/:id" element={<FeatureRoute permission="patients" element={<OpportunityDetailPage />} />} />
            <Route path="crm/appointments" element={<FeatureRoute permission="patients" element={<AppointmentsPage />} />} />
            <Route path="crm/tasks" element={<FeatureRoute permission="patients" element={<CrmTasksPage />} />} />
            <Route path="crm/targets-quotas" element={<FeatureRoute permission="patients" element={<TargetsPage />} />} />
            <Route path="crm/recalls" element={<FeatureRoute permission="patients" element={<RecallsPage />} />} />
            <Route path="crm/call-analytics" element={<FeatureRoute permission="patients" element={<CallAnalyticsPage />} />} />
            <Route path="crm/phone" element={<FeatureRoute permission="patients" element={<PhonePage />} />} />
            <Route path="crm/integrations" element={<FeatureRoute permission="patients" element={<IntegrationsPage />} />} />
            {/* Legacy CRM paths from the earlier wireframe */}
            <Route path="crm/accounts" element={<Navigate to="/app/crm/referrals?tab=partners" replace />} />
            <Route path="crm/outreach" element={<Navigate to="/app/crm/leads" replace />} />
            <Route path="crm/contacts" element={<Navigate to="/app/crm/patients" replace />} />
            <Route path="document-vault" element={<FeatureRoute permission="docvault" element={<ComingSoonPage />} />} />
            <Route path="resources" element={<FeatureRoute permission="resources" element={<ComingSoonPage />} />} />
            <Route path="training" element={<FeatureRoute permission="training" element={<ComingSoonPage />} />} />
            <Route path="inventory" element={<FeatureRoute permission="inventory" element={<ComingSoonPage />} />} />
            <Route path="no-shows" element={<FeatureRoute permission="noshows" element={<ComingSoonPage />} />} />
            <Route path="phone" element={<Navigate to="/app/crm/phone" replace />} />
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
          <Route path="*" element={<Navigate to="/signup" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

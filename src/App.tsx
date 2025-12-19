import { Routes, Route, Navigate } from 'react-router-dom'
import CalendarPage from './pages/CalendarPage'
import OnboardingPage from './pages/onboarding patients/OnboardingPage'
import LoginPatientPage from './pages/onboarding patients/LoginPatientPage'
import VerificationPage from './pages/onboarding patients/VerificationPage'
import ForgotPasswordPage from './pages/onboarding patients/ForgotPasswordPage'
import ResetPasswordPage from './pages/onboarding patients/ResetPasswordPage'
import Myaccount from './pages/patientSetup/Myaccount'
import Layout from './components/Layout'
import PatientLayout from './components/PatientLayout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { PublicRoute } from './components/PublicRoute'
import { OnboardingRoute } from './components/OnboardingRoute'
// Onboarding provider imports
import OnboardingProviderPage from './pages/onboarding provider/OnboardingProviderPage'
import SignInProvider from './pages/onboarding provider/sign-in-provider'
import VerificationProviderPage from './pages/onboarding provider/VerificationProviderPage'
import WelcomeProviderPage from './pages/onboarding provider/WelcomeProviderPage'
// New separated page imports
import AccountDetailsPage from './pages/patientSetup/AccountDetailsPage'
import BookingHistoryPage from './pages/patientSetup/BookingHistoryPage'
import FavouritesPage from './pages/patientSetup/FavouritesPage'
import SettingsPage from './pages/patientSetup/SettingsPage'
import LoginProviderPage from './pages/onboarding provider/LoginProviderPage'
import SearchPage from './pages/Patient/SearchPage'
import ProviderPage from './pages/Patient/ProviderPage'
import BookingPage from './pages/Patient/BookingPage'
import BookingSuccessPage from './pages/Patient/BookingSuccessPage'
import PaymentCallback from './components/PaymentCallback'
import TermsAndPolicyPage from './pages/TermsAndPolicyPage'
import SupportPage from './pages/SupportPage'
import ProviderLayout from './components/ProviderLayout'
import DashboardPage from './pages/provider/DashboardPage'

import ProviderCalendarPage from './pages/provider/ProviderCalendarPage'
import ProviderPatientsPage from './pages/provider/ProviderPatientsPage'
import ProviderServicesPage from './pages/provider/ProviderServicesPage'
import ProviderPaymentsPage from './pages/provider/ProviderPaymentsPage'
import ProviderPlaceholderPage from './pages/provider/ProviderPlaceholderPage'
import ProviderSettingsPage from './pages/provider/ProviderSettingsPage'
import ProviderReportsPage from './pages/provider/ProviderReportsPage'
import ProviderReviewsPage from './pages/provider/ProviderReviewsPage'
import ProviderSupportPage from './pages/provider/ProviderSupportPage'
import { ProviderSearchProvider } from './contexts/ProviderSearchContext'

function App() {

  return (
    <Routes>
      {/* Provider Dashboard Routes - Independent Layout */}
      <Route element={
        <ProtectedRoute>
          <ProviderSearchProvider>
            <ProviderLayout />
          </ProviderSearchProvider>
        </ProtectedRoute>
      }>
        <Route path="/provider/dashboard" element={<DashboardPage />} />
        <Route path="/provider/calendar" element={<ProviderCalendarPage />} />
        <Route path="/provider/patients" element={<ProviderPatientsPage />} />
        <Route path="/provider/services" element={<ProviderServicesPage />} />
        <Route path="/provider/payments" element={<ProviderPaymentsPage />} />
        <Route path="/provider/reports" element={<ProviderReportsPage />} />
        <Route path="/provider/reviews" element={<ProviderReviewsPage />} />
        <Route path="/provider/support" element={<ProviderSupportPage />} />
        <Route path="/provider/settings" element={<ProviderSettingsPage />} />
      </Route>

      <Route element={<Layout />}>
        {/* Patient routes */}
        <Route path="/" element={
          <PublicRoute>
            <OnboardingPage />
          </PublicRoute>
        } />
        <Route path="/onboardingPatient" element={
          <PublicRoute>
            <OnboardingPage />
          </PublicRoute>
        } />
        <Route path="/calendar" element={
          <ProtectedRoute>
            <CalendarPage />
          </ProtectedRoute>
        } />
        <Route path="/sign-in-patient" element={
          <PublicRoute>
            <LoginPatientPage />
          </PublicRoute>
        } />
        <Route path="/verify" element={
          <PublicRoute>
            <VerificationPage />
          </PublicRoute>
        } />
        <Route path="/forgot-password" element={
          <PublicRoute>
            <ForgotPasswordPage />
          </PublicRoute>
        } />
        <Route path="/reset-password" element={
          <PublicRoute>
            <ResetPasswordPage />
          </PublicRoute>
        } />
        <Route path="/terms-and-policy" element={
          <PublicRoute>
            <TermsAndPolicyPage />
          </PublicRoute>
        } />
        <Route path="/support" element={
          <PublicRoute>
            <SupportPage />
          </PublicRoute>
        } />

        {/* <Route path="/patientSetup/Myaccount" element={<Myaccount />} /> */}
        <Route path="/search" element={<SearchPage />} />
        <Route path="/search/provider/:id" element={<ProviderPage />} />
        <Route path="/patient/booking/:id" element={<BookingPage />} />
        <Route path="/patient/booking/success" element={<BookingSuccessPage />} />
        <Route path="/payment/callback" element={<PaymentCallback />} />

        {/* Patient pages with PatientLayout */}
        <Route path="/patientSetup/Myaccount" element={
          <ProtectedRoute>
            <PatientLayout>
              <Myaccount />
            </PatientLayout>
          </ProtectedRoute>
        } />
        {/* Patient pages with PatientLayout */}
        <Route path="/patient/my-account" element={
          <ProtectedRoute>
            <PatientLayout>
              <Myaccount />
            </PatientLayout>
          </ProtectedRoute>
        } />
        <Route path="/account" element={
          <ProtectedRoute>
            <OnboardingRoute>
              <PatientLayout>
                <AccountDetailsPage />
              </PatientLayout>
            </OnboardingRoute>
          </ProtectedRoute>
        } />
        <Route path="/booking-history" element={
          <ProtectedRoute>
            <OnboardingRoute>
              <PatientLayout>
                <BookingHistoryPage />
              </PatientLayout>
            </OnboardingRoute>
          </ProtectedRoute>
        } />
        <Route path="/favourites" element={
          <ProtectedRoute>
            <OnboardingRoute>
              <PatientLayout>
                <FavouritesPage />
              </PatientLayout>
            </OnboardingRoute>
          </ProtectedRoute>
        } />
        <Route path="/patient/settings" element={
          <ProtectedRoute>
            <OnboardingRoute>
              <PatientLayout>
                <SettingsPage />
              </PatientLayout>
            </OnboardingRoute>
          </ProtectedRoute>
        } />

        {/* Provider routes */}
        <Route path="/providers/signup" element={
          <PublicRoute>
            <OnboardingProviderPage />
          </PublicRoute>
        } />
        <Route path="/providers/signin" element={
          <PublicRoute>
            <SignInProvider />
          </PublicRoute>
        } />
        <Route path="/providers/verify" element={
          <PublicRoute>
            <VerificationProviderPage />
          </PublicRoute>
        } />
        <Route path="/welcome-provider" element={
          <ProtectedRoute>
            <WelcomeProviderPage />
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default App
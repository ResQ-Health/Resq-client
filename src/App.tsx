import { Routes, Route, Navigate } from 'react-router-dom'
import CalendarPage from './pages/CalendarPage'
import OnboardingPage from './pages/onboarding patients/OnboardingPage'
import LoginPatientPage from './pages/onboarding patients/LoginPatientPage'
import VerificationPage from './pages/onboarding patients/VerificationPage'
import Myaccount from './pages/patientSetup/Myaccount'
import Layout from './components/Layout'
import PatientLayout from './components/PatientLayout'
import { ProtectedRoute } from './components/ProtectedRoute'
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

function App() {

  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Patient routes */}
        <Route path="/" element={<OnboardingPage />} />
        <Route path="/onboardingPatient" element={<OnboardingPage />} />
        <Route path="/calendar" element={
          <ProtectedRoute>
            <CalendarPage />
          </ProtectedRoute>
        } />
        <Route path="/sign-in-patient" element={<LoginPatientPage />} />
        <Route path="/verify" element={<VerificationPage />} />
        <Route path="/patientSetup/Myaccount" element={<Myaccount />} />

        {/* Patient pages with PatientLayout */}
        <Route path="/my-account" element={
          <ProtectedRoute>
            <PatientLayout>
              <Myaccount />
            </PatientLayout>
          </ProtectedRoute>
        } />
        <Route path="/account" element={
          <ProtectedRoute>
            <PatientLayout>
              <AccountDetailsPage />
            </PatientLayout>
          </ProtectedRoute>
        } />
        <Route path="/booking-history" element={
          <ProtectedRoute>
            <PatientLayout>
              <BookingHistoryPage />
            </PatientLayout>
          </ProtectedRoute>
        } />
        <Route path="/favourites" element={
          <ProtectedRoute>
            <PatientLayout>
              <FavouritesPage />
            </PatientLayout>
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute>
            <PatientLayout>
              <SettingsPage />
            </PatientLayout>
          </ProtectedRoute>
        } />

        {/* Provider routes */}
        <Route path="/onboardingProvider" element={<OnboardingProviderPage />} />
        <Route path="/sign-in-provider" element={<SignInProvider />} />
        <Route path="/sign-in-provider" element={<LoginProviderPage />} />
        <Route path="/verify-provider" element={<VerificationProviderPage />} />
        <Route path="/welcome-provider" element={<WelcomeProviderPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default App
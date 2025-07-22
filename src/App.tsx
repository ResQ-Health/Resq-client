import { Routes, Route, Navigate } from 'react-router-dom'
import CalendarPage from './pages/CalendarPage'
import OnboardingPage from './pages/onboarding patients/OnboardingPage'
import RegisterPatientPage from './pages/onboarding patients/sign-in-patient'
import VerificationPage from './pages/onboarding patients/VerificationPage'
import Myaccount from './pages/patientSetup/Myaccount'
import Layout from './components/Layout'
// Onboarding provider imports
import OnboardingProviderPage from './pages/onboarding provider/OnboardingProviderPage'
import SignInProvider from './pages/onboarding provider/sign-in-provider'
import RegisterProviderPage from './pages/onboarding provider/RegisterProviderPage'
import VerificationProviderPage from './pages/onboarding provider/VerificationProviderPage'
import WelcomeProviderPage from './pages/onboarding provider/WelcomeProviderPage'

function App() {
  
  return (
    <Routes>
      <Route element={<Layout />}>  
        {/* Patient routes */}
        <Route path="/" element={<OnboardingPage />} />
        <Route path="/onboardingPatient" element={<OnboardingPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="Sign-in-Patient" element={<RegisterPatientPage />} />
        <Route path="/verify" element={<VerificationPage />} />
        <Route path="/patientSetup/Myaccount" element={<Myaccount />} />
        {/* Provider routes */}
        <Route path="/onboardingProvider" element={<OnboardingProviderPage />} />
        <Route path="/sign-in-provider" element={<SignInProvider />} />
        <Route path="/register-provider-provider" element={<RegisterProviderPage />} />
        <Route path="/verify-provider" element={<VerificationProviderPage />} />
        <Route path="/welcome-provider" element={<WelcomeProviderPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default App
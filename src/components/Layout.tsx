import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './patient/Footer';

const Layout: React.FC = () => {
  const location = useLocation();
  const hideFooterRoutes = [
    '/',
    '/onboardingPatient',
    '/sign-in-patient',
    '/verify',
    '/forgot-password',
    '/reset-password',
    '/onboardingProvider',
    '/sign-in-provider',
    '/verify-provider',
    '/welcome-provider'
  ];

  const shouldHideFooter = hideFooterRoutes.includes(location.pathname);

  return (
    <div className="min-h-screen flex flex-col bg-[#F9FAFB]">
      <Navbar />
      <main className="flex-1 w-full flex flex-col">
        <div className="w-full max-w-[1440px] mx-auto px-16 flex-1 flex flex-col">
          <Outlet />
        </div>
      </main>
      {!shouldHideFooter && <Footer />}
    </div>
  );
};

export default Layout;

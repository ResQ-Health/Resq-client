import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './patient/Footer';

const Layout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#F9FAFB]">
      <Navbar />
      <main className="flex-1 w-full flex flex-col">
        <div className="w-full max-w-[1440px] mx-auto px-16 flex-1 flex flex-col">
          <Outlet />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Layout; 
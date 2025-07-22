import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

const Layout: React.FC = () => {
  return (
    <>
      <Navbar />
      <main className="flex-grow flex items-center justify-center">
        <Outlet />
      </main>
    </>
  );
};

export default Layout; 
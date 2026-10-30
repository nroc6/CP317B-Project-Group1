/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';

// Pages
import Home from './pages/Home.jsx';
import MarketDetail from './pages/MarketDetail.jsx';
import VendorDetail from './pages/VendorDetail.jsx';
import VendorDashboard from './pages/VendorDashboard.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import Account from './pages/Account.jsx';
import Cart from './pages/Cart.jsx';
import SearchResults from './pages/SearchResults.jsx';
import Favourites from './pages/Favourites.jsx';

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Router>
          <div className="min-h-screen flex flex-col bg-[#FAF6EE] text-[#232323]">
            {/* Global Header */}
            <Header />

            {/* Main Page Viewport */}
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/markets/:id" element={<MarketDetail />} />
                <Route path="/vendors/:id" element={<VendorDetail />} />
                <Route path="/dashboard" element={<VendorDashboard />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/account" element={<Account />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/search" element={<SearchResults />} />
                <Route path="/favourites" element={<Favourites />} />
                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>

            {/* Global Footer */}
            <Footer />
          </div>
        </Router>
      </AuthProvider>
    </ToastProvider>
  );
}

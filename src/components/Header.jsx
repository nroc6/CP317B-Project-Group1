/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingBag, Heart, User, Search, Store, Menu, X, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Header() {
  const { user, isAuthenticated, isVendor, cartItemCount, favourites } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchTerm.trim())}`);
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FAF6EE]/95 backdrop-blur-md border-b border-[#2F5D3A]/10">
      {/* Top Trust Notice */}
      <div className="bg-[#2F5D3A] text-[#FAF6EE] text-xs font-medium py-1 px-4 text-center tracking-wide">
        <span>Ontario Farmers' Market Pre-Orders · 100% Pickup Only · Always Pay in Person at Pickup</span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-4">
          {/* Brand Logo */}
          <Link 
            to="/" 
            className="flex items-center gap-2.5 text-[#2F5D3A] font-bold text-2xl tracking-tight shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F5D3A] rounded-lg"
            aria-label="Basket Home"
          >
            <div className="w-10 h-10 rounded-xl bg-[#2F5D3A] text-[#FAF6EE] flex items-center justify-center shadow-sm">
              <ShoppingBag className="w-5 h-5 text-[#FAF6EE]" />
            </div>
            <div className="flex flex-col">
              <span className="font-display text-2xl font-bold tracking-tight text-[#2F5D3A] leading-none">
                Basket
              </span>
              <span className="text-[10px] tracking-widest text-[#C96F4A] font-bold uppercase mt-0.5">
                Ontario
              </span>
            </div>
          </Link>

          {/* Search Bar (Searches Markets and Products) */}
          <form 
            onSubmit={handleSearch}
            className="hidden md:flex flex-1 max-w-md mx-4 relative"
            role="search"
          >
            <div className="relative w-full">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search Ontario markets, sourdough, peaches, maple..."
                className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white border border-[#2F5D3A]/20 text-sm text-[#232323] placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#2F5D3A] focus:border-transparent transition-all shadow-xs"
              />
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </form>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-[#232323]">
            {isVendor && (
              <Link
                to="/dashboard"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[#2F5D3A] bg-[#2F5D3A]/10 hover:bg-[#2F5D3A]/15 font-semibold transition-colors ${
                  location.pathname === '/dashboard' ? 'ring-1 ring-[#2F5D3A]' : ''
                }`}
              >
                <Store className="w-4 h-4" />
                <span>Vendor Dashboard</span>
              </Link>
            )}

            <Link
              to="/favourites"
              className="flex items-center gap-1.5 text-stone-700 hover:text-[#2F5D3A] transition-colors py-1"
            >
              <Heart className="w-4 h-4 text-[#C96F4A]" />
              <span>Favourites</span>
              {favourites.length > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-[#FAF6EE] text-[#C96F4A] font-bold border border-[#C96F4A]/30">
                  {favourites.length}
                </span>
              )}
            </Link>

            <Link
              to="/cart"
              className="flex items-center gap-2 text-stone-700 hover:text-[#2F5D3A] transition-colors relative py-1"
            >
              <div className="relative">
                <ShoppingBag className="w-5 h-5 text-[#2F5D3A]" />
                {cartItemCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-[#C96F4A] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {cartItemCount}
                  </span>
                )}
              </div>
              <span>Cart & Orders</span>
            </Link>

            {isAuthenticated ? (
              <Link
                to="/account"
                className="flex items-center gap-2 pl-2 text-stone-700 hover:text-[#2F5D3A] transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-[#2F5D3A] text-white flex items-center justify-center text-xs font-bold">
                  {user.firstName ? user.firstName[0] : 'U'}
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-semibold leading-tight">{user.firstName || 'Account'}</span>
                  <span className="text-[10px] text-stone-500 capitalize">{user.role}</span>
                </div>
              </Link>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#2F5D3A] text-[#FAF6EE] hover:bg-[#22442A] text-xs font-semibold transition-all shadow-xs"
              >
                <User className="w-3.5 h-3.5" />
                <span>Log in</span>
              </Link>
            )}
          </nav>

          {/* Mobile Right Icons & Toggle */}
          <div className="flex items-center gap-3 lg:hidden">
            <Link to="/cart" className="relative p-2 text-stone-700 hover:text-[#2F5D3A]">
              <ShoppingBag className="w-6 h-6" />
              {cartItemCount > 0 && (
                <span className="absolute top-1 right-1 bg-[#C96F4A] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
            </Link>

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-stone-700 hover:text-[#2F5D3A] focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Search Input */}
        <div className="md:hidden pb-3">
          <form onSubmit={handleSearch} className="relative w-full">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search markets or produce..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-[#2F5D3A]/20 text-xs text-[#232323] placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#2F5D3A]"
            />
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </form>
        </div>

        {/* Mobile Navigation Dropdown */}
        {isMobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-[#2F5D3A]/10 bg-white/95 rounded-2xl p-4 shadow-xl mb-4 space-y-3 animate-in fade-in duration-150">
            {isVendor && (
              <Link
                to="/dashboard"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-between p-3 rounded-xl bg-[#2F5D3A]/10 text-[#2F5D3A] font-semibold text-sm"
              >
                <div className="flex items-center gap-2">
                  <Store className="w-4 h-4" />
                  <span>Vendor Dashboard</span>
                </div>
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}

            <Link
              to="/favourites"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center justify-between p-3 rounded-xl hover:bg-[#FAF6EE] text-sm text-[#232323]"
            >
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-[#C96F4A]" />
                <span>Favourites</span>
              </div>
              <span className="text-xs font-bold text-[#C96F4A]">{favourites.length}</span>
            </Link>

            <Link
              to="/cart"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center justify-between p-3 rounded-xl hover:bg-[#FAF6EE] text-sm text-[#232323]"
            >
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-[#2F5D3A]" />
                <span>Cart & Orders</span>
              </div>
              <span className="text-xs font-bold bg-[#C96F4A] text-white px-2 py-0.5 rounded-full">
                {cartItemCount}
              </span>
            </Link>

            {isAuthenticated ? (
              <Link
                to="/account"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-[#FAF6EE] text-sm text-[#232323]"
              >
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-[#2F5D3A]" />
                  <span>Account ({user.firstName})</span>
                </div>
                <span className="text-xs text-stone-500 uppercase">{user.role}</span>
              </Link>
            ) : (
              <Link
                to="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#2F5D3A] text-[#FAF6EE] font-semibold text-sm text-center"
              >
                <User className="w-4 h-4" />
                <span>Log in / Sign up</span>
              </Link>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingBag, Lock, Mail, ArrowRight, ShieldCheck, UserCheck, Store } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      addToast('Please provide both email and password.', 'error');
      return;
    }

    setIsLoading(true);
    const result = await login(email, password);
    setIsLoading(false);

    if (result.success) {
      addToast(`Welcome back, ${result.user.firstName}!`);
      if (result.user.role === 'vendor') {
        navigate('/dashboard');
      } else {
        navigate(from === '/login' ? '/' : from);
      }
    } else {
      addToast(result.error || 'Login failed. Please check demo credentials.', 'error');
    }
  };

  const fillDemo = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('demo1234');
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Lockup */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[#2F5D3A] text-white flex items-center justify-center mx-auto shadow-md">
            <ShoppingBag className="w-6 h-6 text-[#FAF6EE]" />
          </div>
          <h1 className="font-display text-3xl font-bold text-[#2F5D3A]">
            Sign in to Basket
          </h1>
          <p className="text-xs text-stone-600">
            Pre-order Ontario market harvest and manage stall inventory
          </p>
        </div>

        {/* Demo Credentials Callout Box */}
        <div className="bg-[#FAF6EE] rounded-2xl p-5 border-2 border-[#2F5D3A]/20 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#C96F4A]">
            <ShieldCheck className="w-4 h-4 text-[#C96F4A]" />
            <span>Interactive Demo Credentials</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Customer Credentials */}
            <div className="bg-white rounded-xl p-3 border border-stone-200 text-xs space-y-1.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5 font-bold text-[#2F5D3A]">
                  <UserCheck className="w-3.5 h-3.5 text-[#2F5D3A]" />
                  <span>Customer Account</span>
                </div>
                <div className="text-stone-600 font-mono text-[11px] pt-1 select-all">
                  customer@basket.ca
                </div>
                <div className="text-stone-400 font-mono text-[10px]">Pass: demo1234</div>
              </div>
              <button
                type="button"
                onClick={() => fillDemo('customer@basket.ca')}
                className="w-full mt-2 py-1 px-2 rounded-lg bg-[#2F5D3A]/10 text-[#2F5D3A] hover:bg-[#2F5D3A]/20 font-bold text-[11px] transition-colors"
              >
                Use Customer
              </button>
            </div>

            {/* Vendor Credentials */}
            <div className="bg-white rounded-xl p-3 border border-stone-200 text-xs space-y-1.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5 font-bold text-[#C96F4A]">
                  <Store className="w-3.5 h-3.5 text-[#C96F4A]" />
                  <span>Vendor Account</span>
                </div>
                <div className="text-stone-600 font-mono text-[11px] pt-1 select-all">
                  vendor@basket.ca
                </div>
                <div className="text-stone-400 font-mono text-[10px]">Pass: demo1234</div>
              </div>
              <button
                type="button"
                onClick={() => fillDemo('vendor@basket.ca')}
                className="w-full mt-2 py-1 px-2 rounded-lg bg-[#C96F4A]/10 text-[#C96F4A] hover:bg-[#C96F4A]/20 font-bold text-[11px] transition-colors"
              >
                Use Vendor
              </button>
            </div>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 sm:p-8 border border-[#2F5D3A]/15 shadow-sm space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="customer@basket.ca"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-300 text-xs text-[#232323] focus:outline-none focus:ring-2 focus:ring-[#2F5D3A]"
              />
              <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-300 text-xs text-[#232323] focus:outline-none focus:ring-2 focus:ring-[#2F5D3A]"
              />
              <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl bg-[#2F5D3A] text-[#FAF6EE] font-bold text-xs hover:bg-[#22442A] transition-all flex items-center justify-center gap-2 shadow-xs"
          >
            <span>{isLoading ? 'Signing In...' : 'Sign In'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <div className="text-center pt-2">
            <span className="text-xs text-stone-500">Don't have an account? </span>
            <Link to="/signup" className="text-xs font-bold text-[#C96F4A] hover:underline">
              Create an account
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

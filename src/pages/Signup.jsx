/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Lock, Mail, User, ArrowRight, Store, AlertCircle, Info, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function Signup() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('customer'); // 'customer' or 'vendor'
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState('');

  const { signup } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMsg('');

    // Validation
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setErrorMsg('Please complete all required fields.');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters in length.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please re-enter.');
      return;
    }

    setIsSubmitting(true);
    const res = await signup({
      firstName,
      lastName,
      email,
      password,
      role,
      vendorName: role === 'vendor' ? vendorName : undefined,
    });
    setIsSubmitting(false);

    if (res.success) {
      if (res.requiresEmailConfirmation) {
        setConfirmationEmail(email.trim().toLowerCase());
        addToast('Check your email to confirm your Basket account.', 'info', 6000);
        return;
      }

      if (role === 'vendor') {
        addToast('Vendor registration submitted! Application is pending admin approval.', 'info', 5000);
        navigate('/dashboard');
      } else {
        addToast(`Welcome to Basket, ${firstName}! You can now reserve fresh market goods.`);
        navigate('/');
      }
    } else {
      setErrorMsg(res.error || 'Failed to create account.');
    }
  };

  if (confirmationEmail) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-white rounded-3xl p-8 border-2 border-[#2F5D3A]/20 shadow-md text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-[#2F5D3A] flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h1 className="font-display text-2xl font-bold text-[#2F5D3A]">Confirm Your Email</h1>
          <p className="text-xs text-stone-600 leading-relaxed">
            We sent a confirmation link to <strong className="text-[#232323]">{confirmationEmail}</strong>.
            Open the link to activate your account, then sign in.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-[#2F5D3A] text-[#FAF6EE] font-bold text-xs hover:bg-[#22442A] transition-colors"
          >
            <span>Go to Sign In</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Lockup */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[#2F5D3A] text-white flex items-center justify-center mx-auto shadow-md">
            <ShoppingBag className="w-6 h-6 text-[#FAF6EE]" />
          </div>
          <h1 className="font-display text-3xl font-bold text-[#2F5D3A]">
            Join Basket
          </h1>
          <p className="text-xs text-stone-600">
            Pre-order from Ontario growers or list your local market harvest
          </p>
        </div>

        {/* Role Toggle Selector */}
        <div className="bg-white p-1 rounded-2xl border border-[#2F5D3A]/20 shadow-xs flex items-center">
          <button
            type="button"
            onClick={() => setRole('customer')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              role === 'customer'
                ? 'bg-[#2F5D3A] text-[#FAF6EE] shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <User className="w-4 h-4" />
            <span>I'm a Customer</span>
          </button>

          <button
            type="button"
            onClick={() => setRole('vendor')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              role === 'vendor'
                ? 'bg-[#2F5D3A] text-[#FAF6EE] shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Store className="w-4 h-4" />
            <span>I'm an Ontario Vendor</span>
          </button>
        </div>

        {/* Vendor Pending Approval Notice */}
        {role === 'vendor' && (
          <div className="bg-[#FAF6EE] border-2 border-[#C96F4A]/40 rounded-2xl p-4 text-xs text-[#232323] space-y-1.5 animate-in fade-in duration-200">
            <div className="flex items-center gap-1.5 font-bold text-[#C96F4A]">
              <Info className="w-4 h-4 text-[#C96F4A] shrink-0" />
              <span>Pending Admin Approval</span>
            </div>
            <p className="text-stone-600 text-[11px] leading-relaxed">
              Vendor accounts require verification to ensure authentic Ontario farm provenance. Publishing products unlocks once an administrator approves your farm stand in Supabase.
            </p>
          </div>
        )}

        {/* Error message */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Signup Form */}
        <form onSubmit={handleSignup} className="bg-white rounded-3xl p-6 sm:p-8 border border-[#2F5D3A]/15 shadow-sm space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                First Name *
              </label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Sarah"
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs text-[#232323] focus:outline-none focus:ring-2 focus:ring-[#2F5D3A]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Last Name *
              </label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Martin"
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs text-[#232323] focus:outline-none focus:ring-2 focus:ring-[#2F5D3A]"
              />
            </div>
          </div>

          {role === 'vendor' && (
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Farm Stand / Business Name
              </label>
              <input
                type="text"
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                placeholder="e.g. Elmira Heritage Gardens"
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs text-[#232323] focus:outline-none focus:ring-2 focus:ring-[#2F5D3A]"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Email Address *
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.ca"
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-300 text-xs text-[#232323] focus:outline-none focus:ring-2 focus:ring-[#2F5D3A]"
              />
              <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Password (min 6 characters) *
            </label>
            <div className="relative">
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-300 text-xs text-[#232323] focus:outline-none focus:ring-2 focus:ring-[#2F5D3A]"
              />
              <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Confirm Password *
            </label>
            <div className="relative">
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-300 text-xs text-[#232323] focus:outline-none focus:ring-2 focus:ring-[#2F5D3A]"
              />
              <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 rounded-xl bg-[#2F5D3A] text-[#FAF6EE] font-bold text-xs hover:bg-[#22442A] transition-all flex items-center justify-center gap-2 shadow-xs disabled:opacity-60"
          >
            <span>
              {isSubmitting
                ? 'Creating Account...'
                : `Create ${role === 'vendor' ? 'Vendor' : 'Customer'} Account`}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <div className="text-center pt-2">
            <span className="text-xs text-stone-500">Already have an account? </span>
            <Link to="/login" className="text-xs font-bold text-[#C96F4A] hover:underline">
              Log in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

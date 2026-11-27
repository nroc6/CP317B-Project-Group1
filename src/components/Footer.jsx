/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, ShieldCheck, Store, Lock, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

// Featured market links in the footer (IDs must match seeded markets).
const FOOTER_MARKETS = [
  { id: 'st-jacobs', label: "St. Jacobs Farmers' Market" },
  { id: 'byward', label: 'ByWard Market (Ottawa)' },
  { id: 'kensington', label: 'Kensington Market (Toronto)' },
  { id: 'hamilton', label: "Hamilton Farmers' Market" },
  { id: 'guelph', label: "Guelph Farmers' Market" },
];

const HOW_IT_WORKS_STEPS = [
  '1. Browse local market inventory',
  '2. Reserve harvest before sell-out',
  '3. Pick up at stall on market morning',
  '4. Pay the vendor in person',
];

// Site-wide footer: brand blurb, market links, how-it-works steps and Supabase status.
export default function Footer() {
  const { isSupabaseConfigured } = useAuth();

  return (
    <footer className="bg-[#22442A] text-[#FAF6EE] mt-16 border-t border-[#2F5D3A]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-[#FAF6EE]/15">
          {/* Brand Info */}
          <div className="md:col-span-1 space-y-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#FAF6EE] text-[#22442A] flex items-center justify-center font-bold">
                <ShoppingBag className="w-4 h-4 text-[#22442A]" />
              </div>
              <span className="font-display text-2xl font-bold tracking-tight text-[#FAF6EE]">Basket</span>
            </Link>
            <p className="text-sm text-[#FAF6EE]/80 leading-relaxed">
              Ontario’s dedicated farmers’ market pre-order platform. Connect directly with regional growers, artisanal bakers, and small-batch food crafters.
            </p>
            <div className="flex items-center gap-2 text-xs text-[#FAF6EE]/90 bg-[#2F5D3A]/60 px-3 py-1.5 rounded-lg border border-[#FAF6EE]/10">
              <ShieldCheck className="w-4 h-4 text-[#C96F4A]" />
              <span>100% Pickup Only · No online payment</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#C96F4A]">
              Ontario Markets
            </h4>
            <ul className="space-y-2 text-sm text-[#FAF6EE]/80">
              {FOOTER_MARKETS.map((m) => (
                <li key={m.id}>
                  <Link to={`/markets/${m.id}`} className="hover:text-white transition-colors">
                    {m.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Community & How it works */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#C96F4A]">
              How Basket Works
            </h4>
            <ul className="space-y-2 text-sm text-[#FAF6EE]/80">
              {HOW_IT_WORKS_STEPS.map((step) => (
                <li key={step} className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#C96F4A] shrink-0" />
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Vendor & Staff Gateway */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#C96F4A]">
              Vendor & Operations
            </h4>
            <div className="flex flex-col gap-2">
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#FAF6EE]/10 hover:bg-[#FAF6EE]/20 text-sm font-medium text-white transition-colors border border-[#FAF6EE]/10"
              >
                <Store className="w-4 h-4 text-[#C96F4A]" />
                <span>Vendor Dashboard</span>
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#FAF6EE]/10 hover:bg-[#FAF6EE]/20 text-sm font-medium text-white transition-colors border border-[#FAF6EE]/10"
              >
                <Lock className="w-4 h-4 text-[#FAF6EE]/70" />
                <span>Staff login</span>
              </Link>
            </div>
            <div className="pt-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/30 border border-[#FAF6EE]/10 text-xs text-[#FAF6EE]/80">
                <span className={`w-2 h-2 rounded-full ${isSupabaseConfigured ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                <span>{isSupabaseConfigured ? 'Supabase: Connected' : 'Supabase: Setup Required'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom row */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-[#FAF6EE]/60 gap-4">
          <p>© {new Date().getFullYear()} Basket Ontario Inc. Built for Ontario farm markets & local food security.</p>
          <div className="flex items-center gap-4">
            <span>Pay in Person · No credit cards collected</span>
            <span>·</span>
            <span>Privacy & Terms</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

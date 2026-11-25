/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Store, ArrowLeft, Star } from 'lucide-react';
import { fetchMarkets, fetchVendors } from '../data.js';
import { isSupabaseConfigured } from '../lib/supabase.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import MarketCard from '../components/MarketCard.jsx';

export default function Favourites() {
  const { favourites, toggleFavourite, isAuthenticated } = useAuth();
  const { addToast } = useToast();

  const [markets, setMarkets] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    setLoading(true);
    Promise.all([fetchMarkets(), fetchVendors()])
      .then(([mRows, vRows]) => {
        if (!cancelled) {
          setMarkets(mRows);
          setVendors(vRows);
        }
      })
      .catch((err) => {
        if (!cancelled) addToast(err.message || 'Could not load favourites.', 'error');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [addToast]);

  const favMarkets = markets.filter((m) => favourites.includes(m.id));
  const favVendors = vendors.filter((v) => favourites.includes(v.id));

  const handleToggleVendor = async (vendorId) => {
    try {
      await toggleFavourite(vendorId, 'vendor');
      addToast('Removed vendor from favourites.', 'info');
    } catch (err) {
      addToast(err.message || 'Could not update favourites.', 'error');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      <div>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-[#2F5D3A] transition-colors mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Markets</span>
        </Link>
        <div className="flex items-center gap-2">
          <Heart className="w-6 h-6 text-[#C96F4A] fill-[#C96F4A]" />
          <h1 className="font-display text-3xl font-bold text-[#2F5D3A]">
            My Favourites
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-stone-600 mt-1">
          Your saved Ontario markets and farm stalls for fast weekly pre-orders.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((idx) => (
            <div
              key={idx}
              className="h-56 rounded-2xl bg-white border border-stone-200 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <>
          {/* Saved Markets */}
          {favMarkets.length > 0 && (
            <section className="space-y-4">
              <h2 className="font-display text-xl font-bold text-[#232323] flex items-center gap-2">
                <Store className="w-5 h-5 text-[#2F5D3A]" />
                <span>Saved Markets ({favMarkets.length})</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {favMarkets.map((market) => (
                  <MarketCard key={market.id} market={market} />
                ))}
              </div>
            </section>
          )}

          {/* Saved Vendors */}
          {favVendors.length > 0 && (
            <section className="space-y-4">
              <h2 className="font-display text-xl font-bold text-[#232323]">
                Saved Vendors ({favVendors.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {favVendors.map((vendor) => (
                  <div
                    key={vendor.id}
                    className="bg-white rounded-3xl p-5 border border-[#2F5D3A]/15 shadow-xs flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl overflow-hidden bg-stone-100 shrink-0">
                        <img
                          src={vendor.image}
                          alt={vendor.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <h4 className="font-display font-bold text-base text-[#232323]">
                          {vendor.name}
                        </h4>
                        <p className="text-xs text-[#C96F4A] font-semibold">{vendor.stallLocation}</p>
                        <div className="flex items-center gap-1 text-xs text-stone-500 mt-0.5">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span>{vendor.rating.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleVendor(vendor.id)}
                        className="p-2 rounded-xl border border-stone-200 text-[#C96F4A] hover:bg-[#FAF6EE]"
                        aria-label="Remove vendor from favourites"
                      >
                        <Heart className="w-4 h-4 fill-[#C96F4A]" />
                      </button>
                      <Link
                        to={`/vendors/${vendor.id}`}
                        className="px-3 py-1.5 rounded-xl bg-[#2F5D3A] text-white text-xs font-bold hover:bg-[#22442A]"
                      >
                        Order
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* If empty */}
          {favMarkets.length === 0 && favVendors.length === 0 && (
            <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-stone-300 p-8 space-y-3">
              <Heart className="w-12 h-12 text-stone-300 mx-auto" />
              <h3 className="font-display text-xl font-bold text-stone-700">
                {isAuthenticated ? 'No favourites saved yet' : 'Log in to view saved favourites'}
              </h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                Click the heart icon on any market or vendor to bookmark them here for fast weekly reservations.
              </p>
              <Link
                to={isAuthenticated ? '/' : '/login'}
                className="inline-block mt-2 px-4 py-2 rounded-xl bg-[#2F5D3A] text-white text-xs font-semibold"
              >
                {isAuthenticated ? 'Explore Markets' : 'Sign In'}
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}

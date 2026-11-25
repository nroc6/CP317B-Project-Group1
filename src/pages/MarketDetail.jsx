/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  MapPin,
  Clock,
  Calendar,
  Store,
  Heart,
  Share2,
  ArrowLeft,
  Star,
  Megaphone,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { fetchMarketById } from '../data.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function MarketDetail() {
  const { id } = useParams();
  const { isAuthenticated, isFavourite, toggleFavourite } = useAuth();
  const { addToast } = useToast();

  const [market, setMarket] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setErrorMsg('');

    fetchMarketById(id)
      .then((res) => {
        if (!active) return;
        if (!res) {
          setErrorMsg('Market not found.');
          setMarket(null);
          setVendors([]);
        } else {
          setMarket(res.market);
          setVendors(res.vendors);
        }
      })
      .catch((err) => {
        if (!active) return;
        setErrorMsg(err.message || 'Failed to load market details.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  const isFav = market ? isFavourite(market.id) : false;

  const handleFavoriteClick = async () => {
    if (!market) return;
    if (!isAuthenticated) {
      addToast('Log in to save favourite markets.', 'info');
      return;
    }
    try {
      const saved = await toggleFavourite(market.id, 'market');
      addToast(saved ? `Added ${market.name} to favourites!` : `Removed ${market.name} from favourites`);
    } catch (err) {
      addToast(err.message || 'Could not update favourites.', 'error');
    }
  };

  const handleShare = () => {
    if (!market) return;
    if (navigator.share) {
      navigator
        .share({
          title: market.name,
          text: `Pre-order fresh farm goods from ${market.name} on Basket!`,
          url: window.location.href,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      addToast('Market link copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="h-72 rounded-3xl bg-white border border-stone-200 animate-pulse" />
        <div className="h-48 rounded-3xl bg-white border border-stone-200 animate-pulse" />
      </div>
    );
  }

  if (errorMsg || !market) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-[#C96F4A] mx-auto" />
        <h1 className="font-display text-2xl font-bold text-[#2F5D3A]">
          {errorMsg || 'Market unavailable'}
        </h1>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2F5D3A] text-white text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Markets</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      <div>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-[#2F5D3A] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Ontario Markets</span>
        </Link>
      </div>

      {/* Header Banner & Metadata */}
      <div className="bg-white rounded-3xl border border-[#2F5D3A]/15 overflow-hidden shadow-xs">
        <div className="relative h-64 sm:h-80 w-full bg-stone-200">
          <img
            src={market.heroImage}
            alt={market.name}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

          <div className="absolute top-4 right-4 flex items-center gap-2">
            <button
              onClick={handleFavoriteClick}
              className={`p-2.5 rounded-full backdrop-blur-md transition-all shadow-md ${
                isFav
                  ? 'bg-[#C96F4A] text-white'
                  : 'bg-white/90 text-stone-700 hover:text-[#C96F4A] hover:bg-white'
              }`}
              aria-label={isFav ? 'Remove from favourites' : 'Save to favourites'}
            >
              <Heart className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
            </button>
            <button
              onClick={handleShare}
              className="p-2.5 rounded-full bg-white/90 text-stone-700 hover:bg-white hover:text-[#2F5D3A] backdrop-blur-md transition-all shadow-md"
              aria-label="Share market"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>

          <div className="absolute bottom-6 left-6 right-6 text-white max-w-3xl">
            <span className="inline-block px-3 py-1 rounded-full bg-[#C96F4A] text-white text-[11px] font-bold uppercase tracking-wider mb-2">
              {market.city} · {market.region}
            </span>
            <h1 className="font-display text-2xl sm:text-4xl font-bold leading-tight drop-shadow-sm">
              {market.name}
            </h1>
            <p className="flex items-center gap-2 text-xs sm:text-sm text-stone-200 mt-2">
              <MapPin className="w-4 h-4 text-[#C96F4A] shrink-0" />
              <span>{market.address}</span>
            </p>
          </div>
        </div>

        <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-3 gap-6 bg-[#FAF6EE]/50 border-t border-stone-100">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-[#C96F4A] uppercase tracking-wider block">
              Market Season
            </span>
            <p className="text-sm font-semibold text-[#232323] flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#2F5D3A]" />
              {market.season}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-bold text-[#C96F4A] uppercase tracking-wider block">
              Pre-Order Pickup Schedule
            </span>
            <p className="text-sm font-semibold text-[#232323] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#2F5D3A]" />
              {market.summaryHours}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-bold text-[#C96F4A] uppercase tracking-wider block">
              Participating Producers
            </span>
            <p className="text-sm font-semibold text-[#2F5D3A] flex items-center gap-2">
              <Store className="w-4 h-4" />
              {vendors.length} Verified Ontario Farm Stands
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Description + Hours Table and Announcements Box */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#2F5D3A]/15 shadow-xs space-y-4">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-[#2F5D3A]">
              About {market.name}
            </h2>
            <p className="text-sm text-stone-700 leading-relaxed">{market.description}</p>
            <div className="pt-2 flex items-center gap-2 text-xs text-stone-600">
              <CheckCircle2 className="w-4 h-4 text-[#2F5D3A]" />
              <span>All orders placed through Basket are collected directly in person at stall checkout.</span>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#2F5D3A]/15 shadow-xs space-y-4">
            <h3 className="font-display text-xl font-bold text-[#2F5D3A] flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#2F5D3A]" />
              <span>Official Operating Hours</span>
            </h3>

            <div className="overflow-hidden rounded-2xl border border-stone-200">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-[#FAF6EE] text-[#2F5D3A] font-bold border-b border-stone-200">
                  <tr>
                    <th className="py-3 px-4">Market Day</th>
                    <th className="py-3 px-4">Operating Hours</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {market.hoursTable.map((row, idx) => (
                    <tr key={idx} className="hover:bg-stone-50 transition-colors">
                      <td className="py-3 px-4 font-semibold text-[#232323]">{row.day}</td>
                      <td className="py-3 px-4 text-stone-600 font-mono tabular-nums">{row.hours}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-[11px] text-stone-500 italic">
              Pre-orders are typically available for pickup at vendor booths during the first 3 hours of the market day.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-[#FAF6EE] rounded-3xl p-6 border-2 border-[#2F5D3A]/20 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-[#2F5D3A]">
              <Megaphone className="w-5 h-5 text-[#C96F4A]" />
              <h3 className="font-display font-bold text-lg">Market Announcements</h3>
            </div>

            {market.announcement && (
              <div className="space-y-3 bg-white rounded-2xl p-4 border border-[#2F5D3A]/15 shadow-xs">
                <div className="relative h-36 w-full rounded-xl overflow-hidden bg-stone-100">
                  <img
                    src={market.announcement.image}
                    alt={market.announcement.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 bg-[#2F5D3A] text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                    {market.announcement.date}
                  </div>
                </div>

                <div>
                  <h4 className="font-display font-bold text-sm text-[#232323] leading-snug">
                    {market.announcement.title}
                  </h4>
                  <p className="text-xs text-stone-600 mt-1.5 leading-relaxed">
                    {market.announcement.content}
                  </p>
                </div>
              </div>
            )}

            <div className="p-3 bg-[#2F5D3A]/10 rounded-xl text-xs text-[#2F5D3A] leading-relaxed">
              <strong>Pre-Order Tip:</strong> Reserve your staples by Friday at noon to ensure growers pack your crate before loading farm trucks.
            </div>
          </div>
        </div>
      </div>

      {/* Vendors Section */}
      <section className="space-y-6 pt-4">
        <div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#2F5D3A]">
            Market Vendors ({vendors.length})
          </h2>
          <p className="text-sm text-stone-600 mt-1">
            Browse weekly farm harvest, artisan sourdough, cheeses, and maple reserves
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vendors.map((vendor) => (
            <div
              key={vendor.id}
              className="group bg-white rounded-3xl border border-[#2F5D3A]/15 overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                <div className="relative h-44 w-full bg-stone-200 overflow-hidden">
                  <img
                    src={vendor.image}
                    alt={vendor.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 left-3 bg-[#FAF6EE] text-[#2F5D3A] text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-xs">
                    {vendor.category}
                  </div>
                  <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm text-[#232323] text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{vendor.rating.toFixed(1)}</span>
                  </div>
                </div>

                <div className="p-5">
                  <h3 className="font-display text-lg font-bold text-[#232323] group-hover:text-[#2F5D3A] transition-colors leading-snug">
                    <Link to={`/vendors/${vendor.id}`}>{vendor.name}</Link>
                  </h3>
                  <p className="text-xs text-[#C96F4A] font-semibold mt-1">
                    {vendor.stallLocation}
                  </p>
                  <p className="text-xs text-stone-600 mt-2 line-clamp-2 leading-relaxed">
                    {vendor.shortDescription}
                  </p>
                </div>
              </div>

              <div className="p-5 pt-0">
                <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                  <span className="text-xs text-stone-500">
                    {vendor.reviewCount} verified reviews
                  </span>
                  <Link
                    to={`/vendors/${vendor.id}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#2F5D3A] hover:text-[#22442A] group-hover:translate-x-0.5 transition-transform"
                  >
                    <span>View Inventory</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Map, 
  List, 
  Search, 
  MapPin, 
  ShieldCheck, 
  Store, 
  ShoppingBag, 
  Navigation, 
  Sparkles,
  ArrowRight,
  Filter
} from 'lucide-react';
import { INITIAL_MARKETS, ASSET_IMAGES } from '../data.js';
import MarketCard from '../components/MarketCard.jsx';
import OntarioMap from '../components/OntarioMap.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function Home() {
  const [viewMode, setViewMode] = useState('list'); // 'map' or 'list'
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const { addToast } = useToast();

  const markets = INITIAL_MARKETS;

  // Extract unique cities and regions for quick filter dropdown
  const uniqueCities = useMemo(() => {
    return Array.from(new Set(markets.map((m) => m.city.split(' (')[0]))).sort();
  }, [markets]);

  const uniqueRegions = useMemo(() => {
    return [
      { id: 'all', label: 'All Ontario' },
      { id: 'Waterloo Region', label: 'Waterloo Region' },
      { id: 'Eastern Ontario', label: 'Ottawa & East' },
      { id: 'Greater Toronto Area', label: 'Toronto & GTA' },
      { id: 'Golden Horseshoe', label: 'Hamilton & Niagara' },
      { id: 'Wellington County', label: 'Guelph & Wellington' },
      { id: 'Middlesex County', label: 'London & Middlesex' },
      { id: 'Kawarthas', label: 'Peterborough & Kawarthas' },
    ];
  }, []);

  // Filtered markets
  const filteredMarkets = useMemo(() => {
    return markets.filter((market) => {
      const matchSearch =
        !searchQuery ||
        market.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        market.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        market.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchCity =
        !selectedCity ||
        market.city.toLowerCase().includes(selectedCity.toLowerCase());

      const matchRegion =
        selectedRegion === 'all' ||
        market.region.toLowerCase().includes(selectedRegion.toLowerCase());

      return matchSearch && matchCity && matchRegion;
    });
  }, [markets, searchQuery, selectedCity, selectedRegion]);

  // Handle optional browser geolocation
  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      addToast('Geolocation is not supported by your browser.', 'error');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        const { latitude, longitude } = position.coords;
        
        // Find closest market by distance
        let closest = null;
        let minDistance = Infinity;

        markets.forEach((m) => {
          const dist = Math.hypot(m.lat - latitude, m.lng - longitude);
          if (dist < minDistance) {
            minDistance = dist;
            closest = m;
          }
        });

        if (closest) {
          setSelectedCity(closest.city.split(' (')[0]);
          addToast(`Found closest market: ${closest.name} in ${closest.city}!`);
        }
      },
      (error) => {
        setIsLocating(false);
        addToast('Location access denied or unavailable. You can choose a city from the dropdown below.', 'info');
      },
      { timeout: 8000 }
    );
  };

  return (
    <div className="space-y-12 pb-16">
      {/* Editorial Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-[#2F5D3A] text-[#FAF6EE] mx-4 sm:mx-6 lg:mx-8 mt-4 shadow-sm">
        <div className="absolute inset-0 z-0 opacity-25">
          <img
            src={ASSET_IMAGES.hero}
            alt="Ontario Farmers Market"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="relative z-10 max-w-5xl mx-auto px-6 py-14 sm:py-20 text-center lg:text-left flex flex-col lg:flex-row items-center justify-between gap-10">
          <div className="space-y-4 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FAF6EE]/15 backdrop-blur-md text-xs font-semibold text-[#FAF6EE] border border-[#FAF6EE]/20">
              <span className="w-2 h-2 rounded-full bg-[#C96F4A]"></span>
              <span>Ontario Harvest Season 2026</span>
            </div>

            <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-white leading-[1.15]">
              Reserve local farm harvest. <br />
              <span className="text-[#C96F4A]">Pay in person</span> at the stall.
            </h1>

            <p className="text-base sm:text-lg text-[#FAF6EE]/90 leading-relaxed font-normal">
              Skip the 7:00 AM rush and guarantee your heritage sourdough, sweet corn, and Niagara peaches. Pre-order directly from Ontario growers — zero card info ever collected.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2 text-xs sm:text-sm text-[#FAF6EE]/80">
              <span className="flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-4 h-4 text-[#C96F4A]" />
                100% Free Pre-Ordering
              </span>
              <span>·</span>
              <span className="flex items-center gap-1.5 font-medium">
                <Store className="w-4 h-4 text-[#C96F4A]" />
                8 Historic Ontario Markets
              </span>
              <span>·</span>
              <span className="flex items-center gap-1.5 font-medium">
                <ShoppingBag className="w-4 h-4 text-[#C96F4A]" />
                Direct-from-Grower Pricing
              </span>
            </div>
          </div>

          {/* Quick Find Market Widget in Hero */}
          <div className="w-full max-w-md bg-white rounded-2xl p-6 text-[#232323] shadow-xl border border-stone-100">
            <h3 className="font-display text-lg font-bold text-[#2F5D3A] mb-1">
              Find Your Market
            </h3>
            <p className="text-xs text-stone-500 mb-4">
              Select an Ontario town or find markets near you
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Choose a city or region
                </label>
                <div className="relative">
                  <select
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    className="w-full pl-3 pr-8 py-2.5 rounded-xl border border-stone-300 text-xs font-medium text-[#232323] bg-white focus:outline-none focus:ring-2 focus:ring-[#2F5D3A]"
                  >
                    <option value="">All Ontario Cities ({markets.length} Markets)</option>
                    {uniqueCities.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleUseLocation}
                  disabled={isLocating}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-[#2F5D3A] text-xs font-semibold text-[#2F5D3A] hover:bg-[#FAF6EE] transition-colors"
                >
                  <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
                  <span>{isLocating ? 'Locating...' : 'Use my location'}</span>
                </button>

                {selectedCity && (
                  <button
                    onClick={() => {
                      setSelectedCity('');
                      setSelectedRegion('all');
                      setSearchQuery('');
                    }}
                    className="text-xs text-stone-500 hover:text-stone-800 underline px-2"
                  >
                    Reset
                  </button>
                )}
              </div>

              <p className="text-[11px] text-stone-400 italic pt-1">
                Note: Location is only used with your permission and is never stored.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Markets Discovery Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Controls Bar: Search, View Mode Toggle, Filter Chips */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#2F5D3A]/10">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#2F5D3A]">
              Ontario Farmers' Markets
            </h2>
            <p className="text-sm text-stone-600 mt-0.5">
              Showing {filteredMarkets.length} of {markets.length} participating community markets
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* View Mode Segmented Control: Map vs List */}
            <div className="flex items-center p-1 bg-white rounded-xl border border-stone-200 shadow-xs">
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'list'
                    ? 'bg-[#2F5D3A] text-[#FAF6EE] shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>List View</span>
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'map'
                    ? 'bg-[#2F5D3A] text-[#FAF6EE] shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Map className="w-3.5 h-3.5" />
                <span>Map View</span>
              </button>
            </div>

            {/* In-page text filter */}
            <div className="relative min-w-[220px]">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by name or crop..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white border border-stone-200 text-xs text-[#232323] placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#2F5D3A]"
              />
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Region Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none text-xs">
          <span className="text-stone-500 font-semibold shrink-0 flex items-center gap-1">
            <Filter className="w-3 h-3 text-[#C96F4A]" />
            Region:
          </span>
          {uniqueRegions.map((region) => (
            <button
              key={region.id}
              onClick={() => setSelectedRegion(region.id)}
              className={`px-3 py-1.5 rounded-full whitespace-nowrap transition-colors font-medium ${
                selectedRegion === region.id
                  ? 'bg-[#2F5D3A] text-white shadow-xs'
                  : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              {region.label}
            </button>
          ))}
        </div>

        {/* Active Filters Summary */}
        {(selectedCity || selectedRegion !== 'all' || searchQuery) && (
          <div className="flex items-center gap-2 text-xs text-stone-600 bg-white/70 px-4 py-2 rounded-xl border border-stone-200">
            <span>Filtered by:</span>
            {selectedCity && (
              <span className="font-semibold text-[#2F5D3A]">City: {selectedCity}</span>
            )}
            {selectedRegion !== 'all' && (
              <span className="font-semibold text-[#2F5D3A]">Region: {selectedRegion}</span>
            )}
            {searchQuery && (
              <span className="font-semibold text-[#2F5D3A]">Keyword: "{searchQuery}"</span>
            )}
            <button
              onClick={() => {
                setSelectedCity('');
                setSelectedRegion('all');
                setSearchQuery('');
              }}
              className="text-[#C96F4A] hover:underline font-bold ml-auto"
            >
              Clear all filters
            </button>
          </div>
        )}

        {/* Content Presentation based on viewMode */}
        {viewMode === 'map' ? (
          <div className="space-y-8">
            {/* Interactive Leaflet / SVG Map */}
            <OntarioMap markets={filteredMarkets} />

            {/* Accompanying Market Cards under Map */}
            <div className="space-y-4">
              <h3 className="font-display text-xl font-bold text-[#2F5D3A]">
                Markets in this View ({filteredMarkets.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredMarkets.map((market) => (
                  <MarketCard key={market.id} market={market} />
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* List View */
          <div>
            {filteredMarkets.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {filteredMarkets.map((market) => (
                  <MarketCard key={market.id} market={market} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-stone-300 p-8">
                <Store className="w-12 h-12 text-stone-400 mx-auto mb-3" />
                <h3 className="font-display text-xl font-bold text-stone-700">No markets found</h3>
                <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1 mb-4">
                  We couldn't find an Ontario market matching your filter criteria. Try resetting your search.
                </p>
                <button
                  onClick={() => {
                    setSelectedCity('');
                    setSelectedRegion('all');
                    setSearchQuery('');
                  }}
                  className="px-4 py-2 rounded-xl bg-[#2F5D3A] text-white text-xs font-semibold"
                >
                  Show All 8 Markets
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Trust & Pre-Order Explanation Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#FAF6EE] rounded-3xl p-8 sm:p-10 border border-[#2F5D3A]/20 shadow-xs">
          <div className="max-w-3xl">
            <span className="text-xs font-bold uppercase tracking-wider text-[#C96F4A]">
              The Basket Guarantee
            </span>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#2F5D3A] mt-1 mb-3">
              Why Ontario markets use Basket for pre-orders
            </h2>
            <p className="text-sm text-stone-700 leading-relaxed">
              Farmers wake up at 4:00 AM to harvest and pack. When produce is pre-ordered, zero harvest goes to waste. When you arrive at the market, your basket is boxed and held behind the stall. You inspect the produce, say hello to the grower, and settle up in person with cash, debit, or e-Transfer.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-8 pt-8 border-t border-[#2F5D3A]/10">
            <div className="space-y-2">
              <div className="w-8 h-8 rounded-lg bg-[#2F5D3A] text-white flex items-center justify-center font-bold text-sm">
                1
              </div>
              <h4 className="font-display font-bold text-base text-[#232323]">Guaranteed Availability</h4>
              <p className="text-xs text-stone-600">
                Never miss out on sold-out sourdough loaves, morning sweet corn, or local honey comb.
              </p>
            </div>

            <div className="space-y-2">
              <div className="w-8 h-8 rounded-lg bg-[#2F5D3A] text-white flex items-center justify-center font-bold text-sm">
                2
              </div>
              <h4 className="font-display font-bold text-base text-[#232323]">Zero Payment Online</h4>
              <p className="text-xs text-stone-600">
                We never ask for credit cards. You pay the vendor directly at the market stall.
              </p>
            </div>

            <div className="space-y-2">
              <div className="w-8 h-8 rounded-lg bg-[#2F5D3A] text-white flex items-center justify-center font-bold text-sm">
                3
              </div>
              <h4 className="font-display font-bold text-base text-[#232323]">Direct Farm Support</h4>
              <p className="text-xs text-stone-600">
                100% of your dollars stay in Ontario agricultural communities and family-run bakeries.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

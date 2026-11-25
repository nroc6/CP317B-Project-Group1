/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, Store, ShoppingBag, ArrowLeft, AlertTriangle } from 'lucide-react';
import { searchCatalog } from '../data.js';
import { isSupabaseConfigured } from '../lib/supabase.js';
import MarketCard from '../components/MarketCard.jsx';
import ProductCard from '../components/ProductCard.jsx';

export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';

  const [results, setResults] = useState({
    markets: [],
    products: [],
    vendorsById: {},
    marketsById: {},
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    searchCatalog(query)
      .then((data) => {
        if (!cancelled) setResults(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Search failed.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [query]);

  const { markets: matchingMarkets, products: matchingProducts, vendorsById, marketsById } = results;

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
        <h1 className="font-display text-3xl font-bold text-[#2F5D3A]">
          Search Results for "{query}"
        </h1>
        {!loading && (
          <p className="text-xs sm:text-sm text-stone-600">
            Found {matchingMarkets.length} markets and {matchingProducts.length} items
          </p>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((idx) => (
            <div
              key={idx}
              className="h-64 rounded-2xl bg-white border border-stone-200 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <>
          {/* Markets Section */}
          {matchingMarkets.length > 0 && (
            <section className="space-y-4">
              <h2 className="font-display text-xl font-bold text-[#232323] flex items-center gap-2">
                <Store className="w-5 h-5 text-[#2F5D3A]" />
                <span>Matching Markets ({matchingMarkets.length})</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {matchingMarkets.map((market) => (
                  <MarketCard key={market.id} market={market} />
                ))}
              </div>
            </section>
          )}

          {/* Products Section */}
          {matchingProducts.length > 0 && (
            <section className="space-y-4">
              <h2 className="font-display text-xl font-bold text-[#232323] flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-[#C96F4A]" />
                <span>Matching Products & Produce ({matchingProducts.length})</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {matchingProducts.map((product) => {
                  const vendor = vendorsById[product.vendorId] || {
                    id: product.vendorId,
                    name: 'Ontario Vendor',
                  };
                  const market = marketsById[vendor.marketId] || null;
                  return (
                    <ProductCard
                      key={product.id}
                      product={product}
                      vendor={vendor}
                      market={market}
                    />
                  );
                })}
              </div>
            </section>
          )}

          {/* No results */}
          {matchingMarkets.length === 0 && matchingProducts.length === 0 && (
            <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-stone-300 p-8 space-y-3">
              <Search className="w-12 h-12 text-stone-400 mx-auto" />
              <h3 className="font-display text-xl font-bold text-stone-700">
                No matches found for "{query}"
              </h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                Try searching for "St. Jacobs", "sourdough", "sweet corn", "Ottawa", "maple", or "peaches".
              </p>
              <Link
                to="/"
                className="inline-block mt-2 px-4 py-2 rounded-xl bg-[#2F5D3A] text-white text-xs font-semibold"
              >
                Show All Markets
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}

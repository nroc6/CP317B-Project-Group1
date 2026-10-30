/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, Store, ShoppingBag, ArrowLeft } from 'lucide-react';
import { INITIAL_MARKETS, getStoredProducts, INITIAL_VENDORS } from '../data.js';
import MarketCard from '../components/MarketCard.jsx';
import ProductCard from '../components/ProductCard.jsx';

export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const cleanQuery = query.trim().toLowerCase();

  const markets = INITIAL_MARKETS;
  const products = getStoredProducts();
  const vendors = INITIAL_VENDORS;

  // Matching markets
  const matchingMarkets = useMemo(() => {
    if (!cleanQuery) return [];
    return markets.filter(
      (m) =>
        m.name.toLowerCase().includes(cleanQuery) ||
        m.city.toLowerCase().includes(cleanQuery) ||
        m.region.toLowerCase().includes(cleanQuery) ||
        m.description.toLowerCase().includes(cleanQuery)
    );
  }, [markets, cleanQuery]);

  // Matching products
  const matchingProducts = useMemo(() => {
    if (!cleanQuery) return [];
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(cleanQuery) ||
        (p.category && p.category.toLowerCase().includes(cleanQuery)) ||
        (p.description && p.description.toLowerCase().includes(cleanQuery))
    );
  }, [products, cleanQuery]);

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
        <p className="text-xs sm:text-sm text-stone-600">
          Found {matchingMarkets.length} markets and {matchingProducts.length} items
        </p>
      </div>

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
              const vendor = vendors.find((v) => v.id === product.vendorId) || {
                id: product.vendorId,
                name: 'Ontario Vendor',
              };
              const market = markets.find((m) => m.id === vendor.marketId) || markets[0];
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
    </div>
  );
}

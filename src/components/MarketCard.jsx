/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Clock, Calendar, Store, Heart, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function MarketCard({ market }) {
  const { isAuthenticated, isFavourite, toggleFavourite } = useAuth();
  const { addToast } = useToast();
  const isFav = isFavourite(market.id);

  const handleFavoriteClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      addToast('Log in to save favourite markets.', 'info');
      return;
    }
    try {
      const saved = await toggleFavourite(market.id, 'market');
      addToast(saved ? `Added ${market.name} to favourites!` : `Removed ${market.name} from favourites`);
    } catch (err) {
      addToast(err.message || 'Could not update favourite.', 'error');
    }
  };

  const vendorTotal =
    typeof market.vendorCount === 'number'
      ? market.vendorCount
      : market.vendorIds
      ? market.vendorIds.length
      : 0;

  return (
    <div className="group bg-white rounded-3xl border border-[#2F5D3A]/15 overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between">
      <div>
        {/* Market Image with Fallback Container */}
        <div className="relative h-48 w-full bg-stone-200 overflow-hidden">
          {market.heroImage ? (
            <img
              src={market.heroImage}
              alt={market.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#2F5D3A]/20 to-[#FAF6EE] text-[#2F5D3A]">
              <Store className="w-12 h-12 stroke-[1.5]" />
            </div>
          )}

          {/* Region / City Tag */}
          <div className="absolute top-3 left-3 bg-[#FAF6EE]/95 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-bold text-[#2F5D3A] uppercase tracking-wider shadow-xs">
            {market.city}
          </div>

          {/* Favourite button */}
          <button
            onClick={handleFavoriteClick}
            className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-md transition-all shadow-xs ${
              isFav
                ? 'bg-[#C96F4A] text-white'
                : 'bg-white/90 text-stone-600 hover:text-[#C96F4A] hover:bg-white'
            }`}
            aria-label={isFav ? 'Remove from favourites' : 'Save to favourites'}
          >
            <Heart className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Card Content */}
        <div className="p-5">
          <h3 className="font-display text-xl font-bold text-[#2F5D3A] group-hover:text-[#22442A] transition-colors leading-snug">
            <Link to={`/markets/${market.id}`}>{market.name}</Link>
          </h3>

          <div className="flex items-start gap-1.5 text-xs text-stone-600 mt-2">
            <MapPin className="w-3.5 h-3.5 text-[#C96F4A] shrink-0 mt-0.5" />
            <span className="line-clamp-1">{market.address}</span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-stone-700 mt-2 font-medium">
            <Clock className="w-3.5 h-3.5 text-[#2F5D3A] shrink-0" />
            <span>{market.summaryHours}</span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-stone-500 mt-1.5">
            <Calendar className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            <span>{market.season}</span>
          </div>

          <p className="text-xs text-stone-600 mt-3 line-clamp-2 leading-relaxed">
            {market.description}
          </p>
        </div>
      </div>

      {/* Card Footer with Vendor Count and Action */}
      <div className="p-5 pt-0">
        <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
          <span className="font-semibold text-[#2F5D3A]">
            {vendorTotal} local {vendorTotal === 1 ? 'vendor' : 'vendors'}
          </span>
          <Link
            to={`/markets/${market.id}`}
            className="inline-flex items-center gap-1 font-bold text-[#C96F4A] hover:text-[#B35835] group-hover:translate-x-0.5 transition-transform"
          >
            <span>View Market</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

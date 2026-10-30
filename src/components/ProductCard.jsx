/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ShoppingBag, Plus, Minus, Check, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function ProductCard({ product, vendor, market }) {
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const { addToCart } = useAuth();
  const { addToast } = useToast();

  const isAvailable = product.isAvailable !== false;

  const handleAddToCart = () => {
    if (!isAvailable) return;

    addToCart(
      product,
      vendor || { id: product.vendorId, name: 'Market Vendor' },
      market || { id: 'market-general', name: 'Ontario Market' },
      quantity
    );

    addToast(`Added ${quantity} × ${product.name} to pre-order basket!`);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  };

  return (
    <div className="bg-white rounded-2xl border border-[#2F5D3A]/15 overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between">
      <div>
        {/* Product Image / Visual Showcase */}
        <div className="relative h-44 w-full bg-[#FAF6EE] overflow-hidden">
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-stone-100 text-stone-400">
              <ShoppingBag className="w-10 h-10 stroke-[1.5]" />
            </div>
          )}

          {/* Availability Badge */}
          <div className="absolute top-2.5 left-2.5">
            {isAvailable ? (
              <span className="inline-flex items-center gap-1 bg-[#2F5D3A] text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300"></span>
                Available this week
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 bg-stone-700 text-stone-200 text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
                Sold out for this pickup
              </span>
            )}
          </div>

          {/* Category Tag */}
          <div className="absolute top-2.5 right-2.5 bg-white/95 backdrop-blur-sm text-stone-600 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border border-stone-200 shadow-xs">
            {product.category || 'Local Good'}
          </div>
        </div>

        {/* Product Details */}
        <div className="p-4">
          <div className="flex items-baseline justify-between gap-2 mb-1">
            <h4 className="font-display font-bold text-base text-[#232323] leading-snug line-clamp-1">
              {product.name}
            </h4>
          </div>

          <div className="flex items-baseline gap-1.5 mb-2">
            <span className="text-lg font-bold text-[#2F5D3A] font-mono tabular-nums">
              ${Number(product.price).toFixed(2)}
            </span>
            <span className="text-xs text-stone-500 font-medium">/ {product.unit}</span>
          </div>

          <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed min-h-[32px]">
            {product.description}
          </p>
        </div>
      </div>

      {/* Interactive Cart Action Footer */}
      <div className="p-4 pt-0">
        {isAvailable ? (
          <div className="flex items-center gap-2 pt-2 border-t border-stone-100">
            {/* Quantity Stepper */}
            <div className="flex items-center border border-stone-200 rounded-xl bg-[#FAF6EE] p-0.5">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-7 h-7 flex items-center justify-center text-stone-600 hover:text-[#2F5D3A] hover:bg-white rounded-lg transition-colors"
                aria-label="Decrease quantity"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-8 text-center text-xs font-bold font-mono tabular-nums text-[#232323]">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="w-7 h-7 flex items-center justify-center text-stone-600 hover:text-[#2F5D3A] hover:bg-white rounded-lg transition-colors"
                aria-label="Increase quantity"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Add to Cart CTA */}
            <button
              type="button"
              onClick={handleAddToCart}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all shadow-xs ${
                justAdded
                  ? 'bg-emerald-700 text-white'
                  : 'bg-[#2F5D3A] hover:bg-[#22442A] text-[#FAF6EE]'
              }`}
            >
              {justAdded ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Added!</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Reserve</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="pt-2 border-t border-stone-100 text-center">
            <span className="text-xs text-stone-400 font-medium">Check back for next week's harvest</span>
          </div>
        )}
      </div>
    </div>
  );
}

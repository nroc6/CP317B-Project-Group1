/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ShoppingBag, 
  Trash2, 
  Plus, 
  Minus, 
  Clock, 
  MapPin, 
  ShieldCheck, 
  Store, 
  CheckCircle2, 
  ArrowRight,
  ArrowLeft,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function Cart() {
  const { 
    cart, 
    cartTotal, 
    cartItemCount, 
    updateCartQuantity, 
    removeFromCart, 
    clearCart,
    placePreOrder,
    isAuthenticated,
    user
  } = useAuth();
  
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [pickupWindow, setPickupWindow] = useState('Saturday 8:30 AM – 10:00 AM');
  const [customerNote, setCustomerNote] = useState('');
  const [placedOrders, setPlacedOrders] = useState(null);

  // Protected route check per prompt: logged-out users opening Cart/Account are sent to /login
  useEffect(() => {
    if (!isAuthenticated) {
      addToast('Please log in to view your pre-order cart.', 'info');
      navigate('/login', { state: { from: { pathname: '/cart' } } });
    }
  }, [isAuthenticated, navigate, addToast]);

  if (!isAuthenticated) return null;

  // Group cart items by vendor
  const itemsByVendor = cart.reduce((acc, item) => {
    const key = item.vendorId || 'general';
    if (!acc[key]) {
      acc[key] = {
        vendorName: item.vendorName,
        marketName: item.marketName,
        stallLocation: item.stallLocation,
        items: [],
      };
    }
    acc[key].items.push(item);
    return acc;
  }, {});

  const handlePlaceOrder = (e) => {
    e.preventDefault();
    if (cart.length === 0) return;

    const orders = placePreOrder({ pickupWindow, customerNote });
    if (orders && orders.length > 0) {
      setPlacedOrders(orders);
      addToast(`Pre-order placed successfully! Order #${orders[0].id}`);
    }
  };

  // SUCCESS SCREEN
  if (placedOrders) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-8 animate-in fade-in duration-300">
        <div className="bg-white rounded-3xl p-8 sm:p-12 border-2 border-[#2F5D3A] shadow-xl text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-[#2F5D3A] flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#C96F4A]">
              Pre-Order Reserved
            </span>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#2F5D3A]">
              Pay in person at pickup.
            </h1>
            <p className="text-sm text-stone-600 max-w-lg mx-auto">
              Your harvest has been allocated directly with the growers. No online payment was processed — simply settle up at the stall when you collect your basket.
            </p>
          </div>

          {/* Itemized Order Receipts */}
          <div className="space-y-4 pt-4 text-left">
            {placedOrders.map((order) => (
              <div
                key={order.id}
                className="p-5 rounded-2xl bg-[#FAF6EE] border border-[#2F5D3A]/20 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-stone-200">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-[#232323]">
                      #{order.id}
                    </span>
                    <span className="text-xs text-stone-500">· {order.vendorName}</span>
                  </div>
                  <span className="font-display text-base font-bold text-[#2F5D3A]">
                    ${Number(order.total).toFixed(2)} CAD
                  </span>
                </div>

                <div className="text-xs text-stone-600 space-y-1">
                  <div className="flex items-center gap-1.5 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-[#C96F4A]" />
                    <span>Pickup Market: {order.marketName}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-medium">
                    <Clock className="w-3.5 h-3.5 text-[#2F5D3A]" />
                    <span>Pickup Window: {order.pickupWindow}</span>
                  </div>
                </div>

                <div className="pt-2 text-xs">
                  <span className="font-bold text-stone-700 block mb-1">Items reserved:</span>
                  <ul className="list-disc list-inside text-stone-600 space-y-0.5">
                    {order.items.map((item, idx) => (
                      <li key={idx}>
                        {item.quantity} × {item.name} (${(item.price * item.quantity).toFixed(2)})
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 bg-emerald-50 text-emerald-900 rounded-2xl text-xs font-medium flex items-center justify-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>Vendors accept Cash, Debit cards, and Interac e-Transfer at their stalls.</span>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Link
              to="/account"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#2F5D3A] text-white text-xs font-bold hover:bg-[#22442A] transition-colors"
            >
              View in My Orders
            </Link>
            <Link
              to="/"
              className="w-full sm:w-auto px-6 py-3 rounded-xl border border-stone-300 text-stone-700 text-xs font-semibold hover:bg-stone-50 transition-colors"
            >
              Back to Markets
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // EMPTY CART
  if (cart.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-[#2F5D3A]/10 text-[#2F5D3A] flex items-center justify-center mx-auto">
          <ShoppingBag className="w-8 h-8 stroke-[1.75]" />
        </div>
        <div className="space-y-2">
          <h1 className="font-display text-3xl font-bold text-[#232323]">
            Your Pre-Order Basket is Empty
          </h1>
          <p className="text-sm text-stone-600 max-w-md mx-auto">
            You haven't reserved any items yet. Browse Ontario markets to pre-order fresh heirloom vegetables, sourdough loaves, and maple preserves.
          </p>
        </div>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#2F5D3A] text-white text-xs font-bold hover:bg-[#22442A] transition-all shadow-xs"
        >
          <span>Explore Ontario Markets</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  // ACTIVE CART
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-[#2F5D3A] transition-colors mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Continue browsing markets</span>
        </Link>
        <h1 className="font-display text-3xl font-bold text-[#2F5D3A]">
          Cart & Pre-Orders
        </h1>
        <p className="text-xs sm:text-sm text-stone-600">
          Review your reserved harvest before placing your pickup order.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Cart Items Grouped by Vendor */}
        <div className="lg:col-span-2 space-y-6">
          {Object.entries(itemsByVendor).map(([vId, group]) => (
            <div
              key={vId}
              className="bg-white rounded-3xl border border-[#2F5D3A]/15 shadow-xs overflow-hidden"
            >
              {/* Group Header */}
              <div className="bg-[#FAF6EE] p-4 sm:p-5 border-b border-stone-100 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Store className="w-4 h-4 text-[#C96F4A]" />
                    <h3 className="font-display font-bold text-base text-[#232323]">
                      {group.vendorName}
                    </h3>
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {group.marketName} · {group.stallLocation || 'Stall pickup'}
                  </p>
                </div>
              </div>

              {/* Items in this vendor group */}
              <div className="divide-y divide-stone-100 p-4 sm:p-5">
                {group.items.map((item) => (
                  <div
                    key={item.id}
                    className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-xl bg-stone-100 overflow-hidden shrink-0 border border-stone-200">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-stone-400">
                            <ShoppingBag className="w-5 h-5" />
                          </div>
                        )}
                      </div>

                      <div>
                        <h4 className="font-display font-bold text-sm text-[#232323] leading-snug">
                          {item.name}
                        </h4>
                        <div className="flex items-baseline gap-1 text-xs text-stone-500 mt-0.5">
                          <span className="font-mono font-bold text-[#2F5D3A]">
                            ${item.price.toFixed(2)}
                          </span>
                          <span>/ {item.unit}</span>
                        </div>
                      </div>
                    </div>

                    {/* Quantity Stepper & Subtotal */}
                    <div className="flex items-center gap-4">
                      <div className="flex items-center border border-stone-200 rounded-xl bg-[#FAF6EE] p-0.5">
                        <button
                          type="button"
                          onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                          className="w-6 h-6 flex items-center justify-center text-stone-600 hover:text-[#2F5D3A] hover:bg-white rounded transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-7 text-center text-xs font-mono font-bold">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                          className="w-6 h-6 flex items-center justify-center text-stone-600 hover:text-[#2F5D3A] hover:bg-white rounded transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <span className="font-display font-bold text-sm text-[#232323] font-mono tabular-nums min-w-[60px] text-right">
                        ${(item.price * item.quantity).toFixed(2)}
                      </span>

                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                        className="text-stone-400 hover:text-rose-600 p-1 rounded transition-colors"
                        title="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Right 1 Col: Pickup Configuration & Order Placement */}
        <div className="space-y-6">
          <form
            onSubmit={handlePlaceOrder}
            className="bg-white rounded-3xl p-6 border-2 border-[#2F5D3A]/20 shadow-sm space-y-5"
          >
            <h3 className="font-display font-bold text-lg text-[#2F5D3A]">
              Pickup Details
            </h3>

            {/* Pickup Window Selector */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#2F5D3A]" />
                <span>Select Pickup Window *</span>
              </label>
              <select
                value={pickupWindow}
                onChange={(e) => setPickupWindow(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-stone-300 text-xs font-semibold text-[#232323] bg-white focus:outline-none focus:ring-2 focus:ring-[#2F5D3A]"
              >
                <option value="Saturday 7:30 AM – 9:00 AM">Saturday 7:30 AM – 9:00 AM (Early Pickup)</option>
                <option value="Saturday 9:00 AM – 10:30 AM">Saturday 9:00 AM – 10:30 AM (Morning Rush)</option>
                <option value="Saturday 10:30 AM – 12:00 PM">Saturday 10:30 AM – 12:00 PM (Mid-day)</option>
                <option value="Thursday 4:00 PM – 6:30 PM">Thursday 4:00 PM – 6:30 PM (Evening Market)</option>
              </select>
            </div>

            {/* Customer Note */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5">
                Note for the Grower (Optional)
              </label>
              <textarea
                rows={2}
                value={customerNote}
                onChange={(e) => setCustomerNote(e.target.value)}
                placeholder="e.g. Bringing my own tote basket, will arrive around 9:15 AM"
                className="w-full p-2.5 rounded-xl border border-stone-300 text-xs text-[#232323] focus:outline-none focus:ring-2 focus:ring-[#2F5D3A]"
              />
            </div>

            {/* In-Person Payment Trust Notice */}
            <div className="bg-[#FAF6EE] p-4 rounded-2xl border border-[#C96F4A]/30 text-xs text-[#232323] space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-[#C96F4A]">
                <ShieldCheck className="w-4 h-4 text-[#C96F4A] shrink-0" />
                <span>Pay In Person at Pickup</span>
              </div>
              <p className="text-[11px] text-stone-600 leading-relaxed">
                Zero credit card information is collected on Basket. You pay each vendor directly at their market stall with Cash, Debit, or e-Transfer.
              </p>
            </div>

            {/* Order Cost Breakdown */}
            <div className="pt-3 border-t border-stone-100 space-y-2 text-xs">
              <div className="flex items-center justify-between text-stone-600">
                <span>Items count:</span>
                <span className="font-mono font-semibold">{cartItemCount} items</span>
              </div>
              <div className="flex items-center justify-between text-stone-600">
                <span>Pre-Order Platform Fee:</span>
                <span className="font-mono font-bold text-[#2F5D3A]">FREE ($0.00)</span>
              </div>
              <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-sm">
                <span className="font-bold text-[#232323]">Estimated Total Due:</span>
                <span className="font-display text-xl font-bold text-[#2F5D3A] font-mono tabular-nums">
                  ${cartTotal.toFixed(2)} CAD
                </span>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 px-4 rounded-xl bg-[#2F5D3A] text-white font-bold text-sm hover:bg-[#22442A] transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <span>Place Pre-Order</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

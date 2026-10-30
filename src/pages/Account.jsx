/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  User, 
  ShoppingBag, 
  Clock, 
  MapPin, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  LogOut, 
  ShieldCheck, 
  Store,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function Account() {
  const { user, isAuthenticated, isVendor, logout, deleteAccount, orders } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Protected route check
  useEffect(() => {
    if (!isAuthenticated) {
      addToast('Please log in to view your account and pre-orders.', 'info');
      navigate('/login');
    }
  }, [isAuthenticated, navigate, addToast]);

  if (!isAuthenticated || !user) return null;

  const handleLogout = () => {
    logout();
    addToast('You have been logged out.');
    navigate('/');
  };

  const handleConfirmDelete = () => {
    deleteAccount();
    addToast('Your account and session have been deleted.', 'info');
    navigate('/');
  };

  // Filter orders relevant to this user
  const userOrders = orders.filter(
    (o) => !o.customerEmail || o.customerEmail.toLowerCase() === user.email.toLowerCase()
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Account Profile Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#2F5D3A]/15 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#2F5D3A] text-white flex items-center justify-center font-bold text-2xl shadow-sm">
            {user.firstName ? user.firstName[0] : 'U'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl font-bold text-[#232323]">
                {user.firstName} {user.lastName}
              </h1>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                isVendor 
                  ? 'bg-[#C96F4A] text-white' 
                  : 'bg-[#2F5D3A]/10 text-[#2F5D3A]'
              }`}>
                {isVendor ? 'Ontario Vendor' : 'Customer Account'}
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">{user.email}</p>
            <p className="text-[11px] text-stone-400 mt-1">
              Member since {user.createdAt || '2026'} · Ontario Food Community
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-stretch sm:self-auto justify-end">
          {isVendor && (
            <Link
              to="/dashboard"
              className="px-3.5 py-2 rounded-xl bg-[#2F5D3A]/10 text-[#2F5D3A] hover:bg-[#2F5D3A]/15 text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Store className="w-4 h-4" />
              <span>Vendor Dashboard</span>
            </Link>
          )}

          <button
            onClick={handleLogout}
            className="px-3.5 py-2 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Log out</span>
          </button>
        </div>
      </div>

      {/* Pre-Orders History */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#2F5D3A]/10">
          <div>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-[#2F5D3A]">
              My Pre-Orders & Pickups
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Pickup only — remember to bring payment to settle in person with the vendor
            </p>
          </div>
          <span className="text-xs font-bold text-stone-500 font-mono">
            {userOrders.length} {userOrders.length === 1 ? 'order' : 'orders'}
          </span>
        </div>

        {userOrders.length > 0 ? (
          <div className="space-y-4">
            {userOrders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-3xl p-6 border border-[#2F5D3A]/15 shadow-xs space-y-4"
              >
                {/* Order Top Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-100">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-sm text-[#232323]">
                      #{order.id}
                    </span>
                    <span className="text-xs text-stone-400">Placing Date: {order.date}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 ${
                      order.status.includes('Completed')
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-[#FAF6EE] text-[#C96F4A] border border-[#C96F4A]/30'
                    }`}>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{order.status}</span>
                    </span>
                  </div>
                </div>

                {/* Pickup details strip */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-[#FAF6EE] rounded-2xl text-xs">
                  <div>
                    <span className="text-stone-500 font-semibold block">Market & Vendor</span>
                    <span className="font-bold text-[#2F5D3A]">{order.vendorName}</span>
                    <div className="flex items-center gap-1 text-stone-600 mt-0.5">
                      <MapPin className="w-3 h-3 text-[#C96F4A]" />
                      <span>{order.marketName}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-stone-500 font-semibold block">Pickup Window</span>
                    <div className="flex items-center gap-1 font-bold text-[#232323] mt-0.5">
                      <Clock className="w-3 h-3 text-[#2F5D3A]" />
                      <span>{order.pickupWindow}</span>
                    </div>
                    <span className="text-[11px] text-[#C96F4A] font-semibold mt-0.5 block">
                      Pay in person (Cash, Debit, e-Transfer)
                    </span>
                  </div>
                </div>

                {/* Itemized product list */}
                <div className="space-y-2 pt-1">
                  <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block">
                    Reserved Items
                  </span>
                  <div className="divide-y divide-stone-100">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="py-2 flex items-center justify-between text-xs">
                        <span className="font-medium text-[#232323]">
                          {item.quantity} × {item.name}
                          {item.unit && <span className="text-stone-400"> ({item.unit})</span>}
                        </span>
                        <span className="font-mono font-semibold text-stone-700">
                          ${(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total */}
                <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-sm">
                  <span className="font-bold text-[#232323]">Total Due at Pickup:</span>
                  <span className="font-display text-lg font-bold text-[#2F5D3A] font-mono tabular-nums">
                    ${Number(order.total).toFixed(2)} CAD
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-8 border border-dashed border-stone-300 text-center space-y-3">
            <ShoppingBag className="w-10 h-10 text-stone-400 mx-auto" />
            <h3 className="font-display font-bold text-base text-stone-700">
              No pre-orders placed yet
            </h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              Explore your local Ontario farmers' market, add fresh items to your basket, and reserve your pickup.
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2F5D3A] text-white text-xs font-bold"
            >
              <span>Browse Markets</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </div>

      {/* Account Settings & Danger Zone */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-rose-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-rose-700">
          <AlertTriangle className="w-5 h-5 text-rose-600" />
          <h3 className="font-display text-lg font-bold">Account Management</h3>
        </div>
        <p className="text-xs text-stone-600 leading-relaxed">
          Need to close your account? This will remove your account profile and active cart session.
        </p>

        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 text-xs font-bold transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          <span>Delete Account</span>
        </button>
      </div>

      {/* Delete Account Modal Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-stone-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="font-display text-xl font-bold text-[#232323]">
                Confirm Account Deletion
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Are you sure you want to delete your Basket account? This action will immediately end your session and clear your active cart items.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-stone-300 text-xs font-semibold text-stone-700 hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs"
              >
                Yes, Delete My Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

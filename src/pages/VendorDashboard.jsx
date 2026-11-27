/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Store,
  Plus,
  Package,
  Clock,
  DollarSign,
  Edit3,
  Trash2,
  X,
  Eye,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { fetchProductsByVendor, ASSET_IMAGES, resolveAssetImage } from '../data.js';
import { apiRequest } from '../lib/supabase.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

// Options for the product form; must match ALLOWED_CATEGORIES / ALLOWED_IMAGE_KEYS in server/models/Product.ts.
const CATEGORY_OPTIONS = ['Produce', 'Bakery', 'Honey & Preserves', 'Dairy & Cheese', 'Meats & Dairy'];
const IMAGE_OPTIONS = [
  { key: 'produce', label: 'Fresh Produce Crate' },
  { key: 'bakery', label: 'Artisan Hearth Bread' },
  { key: 'preserves', label: 'Maple & Wildflower Honey' },
  { key: 'hero', label: 'Market Morning Stall' },
];

// Blank add/edit product form.
const EMPTY_FORM = {
  name: '',
  price: '',
  unit: 'each',
  category: 'Produce',
  description: '',
  isAvailable: true,
  imageKey: 'produce',
};

// Adds the resolved image src to a product returned by the API.
const withImage = (product) => ({ ...product, image: resolveAssetImage(product.imageKey) });

// /dashboard — vendor-only page to manage stall inventory and incoming pickup orders.
export default function VendorDashboard() {
  const {
    user,
    accessToken,
    authLoading,
    isVendor,
    isAuthenticated,
    orders,
    transitionOrderStatus,
  } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  // Only signed-in vendors may stay on this page.
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      addToast('Please log in with a vendor account to view the dashboard.', 'info');
      navigate('/login');
      return;
    }
    if (!isVendor) {
      addToast('Access restricted: Customer accounts cannot access the Vendor Dashboard.', 'error');
      navigate('/');
    }
  }, [authLoading, isAuthenticated, isVendor, navigate, addToast]);

  const [myProducts, setMyProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Add/edit product form values.
  const [form, setForm] = useState(EMPTY_FORM);
  const updateForm = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const vendorId = user?.vendorId || '';
  const vendorName = user?.vendorName || 'Vendor Stall';
  const isApproved = Boolean(user?.isApproved);

  // Load this vendor's products (including sold-out ones).
  useEffect(() => {
    if (!vendorId) {
      setLoadingProducts(false);
      return;
    }
    let active = true;
    setLoadingProducts(true);
    fetchProductsByVendor(vendorId)
      .then((rows) => {
        if (active) setMyProducts(rows);
      })
      .catch((err) => {
        if (active) addToast(err.message || 'Failed to load stall inventory.', 'error');
      })
      .finally(() => {
        if (active) setLoadingProducts(false);
      });
    return () => {
      active = false;
    };
  }, [vendorId, addToast]);

  // Incoming pre-orders for this vendor stall
  const vendorOrders = useMemo(() => {
    if (!vendorId) return [];
    return orders.filter((o) => o.vendorId === vendorId);
  }, [orders, vendorId]);

  // Orders still waiting for pickup, and their combined value.
  const pendingOrders = useMemo(
    () => vendorOrders.filter((o) => o.status === 'awaiting_pickup'),
    [vendorOrders]
  );

  const pendingTotal = useMemo(
    () => pendingOrders.reduce((sum, o) => sum + Number(o.total || 0), 0),
    [pendingOrders]
  );

  // Opens the form pre-filled with an existing product.
  const startEdit = (product) => {
    setEditingProduct(product);
    setForm({
      name: product.name,
      price: product.price.toString(),
      unit: product.unit,
      category: product.category || 'Produce',
      description: product.description || '',
      isAvailable: product.isAvailable !== false,
      imageKey: product.imageKey || 'produce',
    });
    setIsAddingProduct(true);
  };

  // Clears and closes the form.
  const resetForm = () => {
    setEditingProduct(null);
    setForm(EMPTY_FORM);
    setIsAddingProduct(false);
  };

  // Creates or updates a product via the API (the server re-validates everything).
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!accessToken) return;

    if (!form.name.trim() || !form.price) {
      addToast('Please enter both a product name and price.', 'error');
      return;
    }

    const priceNum = parseFloat(form.price);
    if (isNaN(priceNum) || priceNum <= 0) {
      addToast('Please enter a valid positive price.', 'error');
      return;
    }

    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        price: priceNum,
        unit: form.unit.trim(),
        category: form.category,
        description: form.description.trim(),
        isAvailable: form.isAvailable,
        imageKey: form.imageKey,
      };

      if (editingProduct) {
        const res = await apiRequest(
          `/api/products/${encodeURIComponent(editingProduct.id)}`,
          { method: 'PATCH', body: JSON.stringify(body) },
          accessToken
        );
        const updatedItem = withImage(res.product);
        setMyProducts((prev) => prev.map((p) => (p.id === updatedItem.id ? updatedItem : p)));
        addToast(`Updated "${updatedItem.name}". Public vendor page updated!`);
      } else {
        const res = await apiRequest(
          '/api/products',
          { method: 'POST', body: JSON.stringify(body) },
          accessToken
        );
        const createdItem = withImage(res.product);
        setMyProducts((prev) => [createdItem, ...prev]);
        addToast(`Added "${createdItem.name}" to this week's inventory!`);
      }
      resetForm();
    } catch (err) {
      addToast(err.message || 'Could not save product.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Flips a product between available and sold out.
  const toggleAvailability = async (product) => {
    if (!accessToken) return;
    try {
      const nextState = product.isAvailable === false;
      const res = await apiRequest(
        `/api/products/${encodeURIComponent(product.id)}`,
        { method: 'PATCH', body: JSON.stringify({ isAvailable: nextState }) },
        accessToken
      );
      const updatedItem = withImage(res.product);
      setMyProducts((prev) => prev.map((p) => (p.id === updatedItem.id ? updatedItem : p)));
      addToast(
        nextState
          ? `Marked "${product.name}" as available this week!`
          : `Marked "${product.name}" as sold out.`
      );
    } catch (err) {
      addToast(err.message || 'Failed to update availability.', 'error');
    }
  };

  // Deletes a product after a confirm prompt.
  const handleDeleteProduct = async (productId, productName) => {
    if (!accessToken) return;
    if (!window.confirm(`Are you sure you want to remove "${productName}" from your inventory?`)) {
      return;
    }

    try {
      await apiRequest(
        `/api/products/${encodeURIComponent(productId)}`,
        { method: 'DELETE' },
        accessToken
      );
      setMyProducts((prev) => prev.filter((p) => p.id !== productId));
      addToast(`Removed "${productName}".`);
    } catch (err) {
      addToast(err.message || 'Failed to delete product.', 'error');
    }
  };

  // Marks an order as picked up (completed) or no-show.
  const handleOrderTransition = async (orderId, targetStatus) => {
    try {
      await transitionOrderStatus(orderId, targetStatus);
      addToast(
        targetStatus === 'completed'
          ? `Order #${orderId} marked paid & picked up!`
          : `Order #${orderId} marked as no-show.`
      );
    } catch (err) {
      addToast(err.message || 'Could not update order status.', 'error');
    }
  };

  if (authLoading || !isAuthenticated || !isVendor) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#2F5D3A]/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#2F5D3A] text-white text-[10px] font-bold uppercase tracking-wider">
              Vendor Portal
            </span>
            <span className="text-xs text-stone-500">Live Sync via Supabase</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#2F5D3A] mt-1">
            {vendorName} Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-stone-600">
            Manage your weekly harvest catalogue, prices, and incoming market pickup orders.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {vendorId && (
            <Link
              to={`/vendors/${vendorId}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#2F5D3A]/20 text-[#2F5D3A] text-xs font-semibold hover:bg-[#FAF6EE] transition-colors shadow-xs"
            >
              <Eye className="w-4 h-4" />
              <span>View Public Stall</span>
            </Link>
          )}

          <button
            onClick={() => {
              resetForm();
              setIsAddingProduct(true);
            }}
            disabled={!isApproved}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2F5D3A] text-[#FAF6EE] text-xs font-bold hover:bg-[#22442A] transition-colors shadow-xs disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Item</span>
          </button>
        </div>
      </div>

      {/* Pending Admin Approval Banner */}
      {!isApproved && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-5 flex items-start gap-3 text-xs text-amber-950">
          <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Pending Admin Approval</p>
            <p>
              Your vendor application has been received and your stall is currently awaiting approval. Once approved by an administrator, you can publish live items to your market catalogue.
            </p>
          </div>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-[#2F5D3A]/15 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#2F5D3A]/10 text-[#2F5D3A] flex items-center justify-center shrink-0">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
              Active Inventory
            </span>
            <h3 className="font-display text-2xl font-bold text-[#232323] font-mono tabular-nums">
              {myProducts.length} items
            </h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-[#2F5D3A]/15 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#C96F4A]/10 text-[#C96F4A] flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
              Pending Pickups
            </span>
            <h3 className="font-display text-2xl font-bold text-[#232323] font-mono tabular-nums">
              {pendingOrders.length} {pendingOrders.length === 1 ? 'order' : 'orders'}
            </h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-[#2F5D3A]/15 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-[#2F5D3A] flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
              Pending In-Person Total
            </span>
            <h3 className="font-display text-2xl font-bold text-[#2F5D3A] font-mono tabular-nums">
              ${pendingTotal.toFixed(2)}
            </h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-[#2F5D3A]/15 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
              Total Orders Recorded
            </span>
            <h3 className="font-display text-lg font-bold text-[#232323] font-mono tabular-nums">
              {vendorOrders.length} total
            </h3>
          </div>
        </div>
      </div>

      {/* Add / Edit Product Form */}
      {isAddingProduct && isApproved && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-[#2F5D3A]/30 shadow-md">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-stone-100">
            <div>
              <h3 className="font-display text-xl font-bold text-[#2F5D3A]">
                {editingProduct ? `Edit "${editingProduct.name}"` : 'Add New Market Item'}
              </h3>
              <p className="text-xs text-stone-500">
                Saved directly to Supabase for your public stall page.
              </p>
            </div>
            <button
              onClick={resetForm}
              className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg"
              aria-label="Cancel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSaveProduct} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => updateForm('name', e.target.value)}
                  placeholder="e.g. Heirloom Yellow Plum Tomatoes"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs text-[#232323] focus:outline-none focus:ring-2 focus:ring-[#2F5D3A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Category *
                </label>
                <select
                  value={form.category}
                  onChange={(e) => updateForm('category', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs text-[#232323] focus:outline-none focus:ring-2 focus:ring-[#2F5D3A]"
                >
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Price ($ CAD) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-xs font-bold">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.25"
                    min="0.5"
                    required
                    value={form.price}
                    onChange={(e) => updateForm('price', e.target.value)}
                    placeholder="6.50"
                    className="w-full pl-7 pr-3 py-2 rounded-xl border border-stone-300 text-xs text-[#232323] font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-[#2F5D3A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Unit (e.g. dozen, lb, 500ml) *
                </label>
                <input
                  type="text"
                  required
                  value={form.unit}
                  onChange={(e) => updateForm('unit', e.target.value)}
                  placeholder="dozen, basket, lb, loaf"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs text-[#232323] focus:outline-none focus:ring-2 focus:ring-[#2F5D3A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Photo Asset Preset
                </label>
                <select
                  value={form.imageKey}
                  onChange={(e) => updateForm('imageKey', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs text-[#232323] focus:outline-none focus:ring-2 focus:ring-[#2F5D3A]"
                >
                  {IMAGE_OPTIONS.map((opt) => (
                    <option key={opt.key} value={opt.key}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Description & Tasting Notes
              </label>
              <textarea
                rows={2}
                value={form.description}
                onChange={(e) => updateForm('description', e.target.value)}
                placeholder="Where was it harvested? Variety, flavor characteristics, or preparation tips."
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs text-[#232323] focus:outline-none focus:ring-2 focus:ring-[#2F5D3A]"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-[#FAF6EE] rounded-xl border border-stone-200">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-[#232323]">
                  Available for this week's pickup
                </span>
                <span className="text-[11px] text-stone-500">
                  Toggle off if this crop is sold out or pending harvest.
                </span>
              </div>
              <button
                type="button"
                onClick={() => updateForm('isAvailable', !form.isAvailable)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  form.isAvailable ? 'bg-[#2F5D3A]' : 'bg-stone-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    form.isAvailable ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 rounded-xl border border-stone-300 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-[#2F5D3A] text-white text-xs font-bold hover:bg-[#22442A] transition-colors shadow-xs disabled:opacity-50"
              >
                {saving
                  ? 'Saving...'
                  : editingProduct
                  ? 'Save Product Changes'
                  : 'Publish to Market Stall'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Product List */}
      <div className="bg-white rounded-3xl border border-[#2F5D3A]/15 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold text-[#2F5D3A]">
              My Product Catalogue ({myProducts.length})
            </h2>
            <p className="text-xs text-stone-500">
              Edits persist in PostgreSQL and immediately reflect on your public vendor page.
            </p>
          </div>
        </div>

        {loadingProducts ? (
          <div className="p-8 text-center text-xs text-stone-500">Loading stall inventory...</div>
        ) : myProducts.length > 0 ? (
          <div className="divide-y divide-stone-100">
            {myProducts.map((product) => (
              <div
                key={product.id}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#FAF6EE]/40 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-stone-100 overflow-hidden shrink-0 border border-stone-200">
                    <img
                      src={product.image || ASSET_IMAGES.produce}
                      alt={product.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-display font-bold text-base text-[#232323]">
                        {product.name}
                      </h4>
                      <span className="text-[10px] uppercase font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded">
                        {product.category || 'Produce'}
                      </span>
                    </div>

                    <div className="flex items-baseline gap-1.5">
                      <span className="text-sm font-bold text-[#2F5D3A] font-mono tabular-nums">
                        ${Number(product.price).toFixed(2)}
                      </span>
                      <span className="text-xs text-stone-500">/ {product.unit}</span>
                    </div>

                    <p className="text-xs text-stone-600 line-clamp-1 max-w-lg">
                      {product.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                  <button
                    onClick={() => toggleAvailability(product)}
                    disabled={!isApproved}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all disabled:opacity-50 ${
                      product.isAvailable !== false
                        ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                        : 'bg-stone-200 text-stone-700 hover:bg-stone-300'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        product.isAvailable !== false ? 'bg-emerald-600' : 'bg-stone-500'
                      }`}
                    />
                    <span>{product.isAvailable !== false ? 'Available' : 'Sold Out'}</span>
                  </button>

                  <button
                    onClick={() => startEdit(product)}
                    disabled={!isApproved}
                    className="p-2 text-stone-600 hover:text-[#2F5D3A] hover:bg-stone-100 rounded-xl transition-colors disabled:opacity-50"
                    title="Edit item"
                    aria-label={`Edit ${product.name}`}
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDeleteProduct(product.id, product.name)}
                    disabled={!isApproved}
                    className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors disabled:opacity-50"
                    title="Delete item"
                    aria-label={`Delete ${product.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 p-6">
            <Package className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <h4 className="font-display font-bold text-stone-700">No products added yet</h4>
            <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1 mb-4">
              {isApproved
                ? 'Click "Add New Item" above to publish your first market item.'
                : 'Your catalogue unlocks once your vendor stall is approved.'}
            </p>
          </div>
        )}
      </div>

      {/* Live Incoming Pre-Orders Batch Table */}
      <div className="bg-[#FAF6EE] rounded-3xl p-6 sm:p-8 border border-[#2F5D3A]/20 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-display text-xl font-bold text-[#2F5D3A]">
              Incoming Pre-Orders ({vendorOrders.length})
            </h3>
            <p className="text-xs text-stone-600">
              Customer reservations to pack before market morning. Collect payment in person at pickup.
            </p>
          </div>
          <span className="text-xs font-bold text-[#C96F4A] bg-white px-3 py-1 rounded-full border border-[#C96F4A]/30 self-start sm:self-auto">
            Pay in person at pickup
          </span>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF6EE] text-[#2F5D3A] font-bold border-b border-stone-200">
              <tr>
                <th className="py-3 px-4">Order #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Reserved Items</th>
                <th className="py-3 px-4">Total Due</th>
                <th className="py-3 px-4">Pickup Window</th>
                <th className="py-3 px-4">Status / Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {vendorOrders.length > 0 ? (
                vendorOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-stone-50">
                    <td className="py-3 px-4 font-mono font-bold text-[#232323]">#{order.id}</td>
                    <td className="py-3 px-4 font-medium">
                      <div>{order.customerName}</div>
                      <div className="text-[10px] text-stone-400">{order.customerEmail}</div>
                    </td>
                    <td className="py-3 px-4 text-stone-600">
                      {order.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-[#2F5D3A]">
                      ${Number(order.total).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-stone-500">{order.pickupWindow}</td>
                    <td className="py-3 px-4">
                      {order.status === 'awaiting_pickup' ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOrderTransition(order.id, 'completed')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#2F5D3A] text-white text-[11px] font-bold hover:bg-[#22442A]"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Mark Picked Up</span>
                          </button>
                          <button
                            onClick={() => handleOrderTransition(order.id, 'no_show')}
                            className="px-2 py-1 rounded-lg border border-stone-300 text-stone-600 text-[11px] font-semibold hover:bg-stone-100"
                          >
                            No-Show
                          </button>
                        </div>
                      ) : (
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            order.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-stone-200 text-stone-700'
                          }`}
                        >
                          {order.statusLabel}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-stone-500">
                    No pre-orders received for this stall yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

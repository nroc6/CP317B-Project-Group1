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
  Check, 
  X, 
  Eye, 
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { 
  getStoredProducts, 
  saveStoredProducts, 
  ASSET_IMAGES,
  INITIAL_VENDORS 
} from '../data.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function VendorDashboard() {
  const { user, isVendor, isAuthenticated } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  // Role check & protection: customers redirected home with toast
  useEffect(() => {
    if (!isAuthenticated) {
      addToast('Please log in with a vendor account to view the dashboard.', 'info');
      navigate('/login');
      return;
    }
    if (!isVendor) {
      addToast('Access restricted: Customer accounts cannot access the Vendor Dashboard.', 'error');
      navigate('/');
    }
  }, [isAuthenticated, isVendor, navigate, addToast]);

  const [products, setProducts] = useState(() => getStoredProducts());
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formUnit, setFormUnit] = useState('each');
  const [formCategory, setFormCategory] = useState('Produce');
  const [formDescription, setFormDescription] = useState('');
  const [formIsAvailable, setFormIsAvailable] = useState(true);
  const [formImage, setFormImage] = useState(ASSET_IMAGES.produce);

  const vendorId = user?.vendorId || 'v-harvest-table';
  const vendorName = user?.vendorName || 'Harvest Table Organics';

  // Vendor's own products
  const myProducts = useMemo(() => {
    return products.filter((p) => p.vendorId === vendorId);
  }, [products, vendorId]);

  // Open edit modal
  const startEdit = (product) => {
    setEditingProduct(product);
    setFormName(product.name);
    setFormPrice(product.price.toString());
    setFormUnit(product.unit);
    setFormCategory(product.category || 'Produce');
    setFormDescription(product.description || '');
    setFormIsAvailable(product.isAvailable !== false);
    setFormImage(product.image || ASSET_IMAGES.produce);
    setIsAddingProduct(true);
  };

  const resetForm = () => {
    setEditingProduct(null);
    setFormName('');
    setFormPrice('');
    setFormUnit('each');
    setFormCategory('Produce');
    setFormDescription('');
    setFormIsAvailable(true);
    setFormImage(ASSET_IMAGES.produce);
    setIsAddingProduct(false);
  };

  // Save (Add or Update)
  const handleSaveProduct = (e) => {
    e.preventDefault();
    if (!formName.trim() || !formPrice) {
      addToast('Please enter both a product name and price.', 'error');
      return;
    }

    const priceNum = parseFloat(formPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      addToast('Please enter a valid positive price.', 'error');
      return;
    }

    if (editingProduct) {
      // Update existing
      const updated = products.map((p) =>
        p.id === editingProduct.id
          ? {
              ...p,
              name: formName.trim(),
              price: priceNum,
              unit: formUnit.trim(),
              category: formCategory,
              description: formDescription.trim(),
              isAvailable: formIsAvailable,
              image: formImage,
            }
          : p
      );
      saveStoredProducts(updated);
      setProducts(updated);
      addToast(`Updated "${formName.trim()}". Public vendor page updated!`);
    } else {
      // Add new product
      const newProduct = {
        id: 'p-' + Date.now(),
        vendorId,
        name: formName.trim(),
        price: priceNum,
        unit: formUnit.trim(),
        category: formCategory,
        description: formDescription.trim(),
        isAvailable: formIsAvailable,
        image: formImage,
      };
      const updated = [newProduct, ...products];
      saveStoredProducts(updated);
      setProducts(updated);
      addToast(`Added "${formName.trim()}" to this week's inventory!`);
    }

    resetForm();
  };

  // Quick toggle availability directly from list
  const toggleAvailability = (productId) => {
    const updated = products.map((p) =>
      p.id === productId ? { ...p, isAvailable: !p.isAvailable } : p
    );
    saveStoredProducts(updated);
    setProducts(updated);
    const item = products.find((p) => p.id === productId);
    addToast(
      item?.isAvailable
        ? `Marked "${item.name}" as sold out.`
        : `Marked "${item?.name}" as available this week!`
    );
  };

  // Delete product
  const handleDeleteProduct = (productId, productName) => {
    if (window.confirm(`Are you sure you want to remove "${productName}" from your inventory?`)) {
      const updated = products.filter((p) => p.id !== productId);
      saveStoredProducts(updated);
      setProducts(updated);
      addToast(`Removed "${productName}".`);
    }
  };

  if (!isAuthenticated || !isVendor) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Dashboard Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#2F5D3A]/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#2F5D3A] text-white text-[10px] font-bold uppercase tracking-wider">
              Vendor Portal
            </span>
            <span className="text-xs text-stone-500">Live Sync to Public Stall</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#2F5D3A] mt-1">
            {vendorName} Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-stone-600">
            Manage your weekly harvest catalogue, prices, and pre-order availability.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to={`/vendors/${vendorId}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#2F5D3A]/20 text-[#2F5D3A] text-xs font-semibold hover:bg-[#FAF6EE] transition-colors shadow-xs"
          >
            <Eye className="w-4 h-4" />
            <span>View Public Stall</span>
          </Link>

          <button
            onClick={() => {
              resetForm();
              setIsAddingProduct(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2F5D3A] text-[#FAF6EE] text-xs font-bold hover:bg-[#22442A] transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Item</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
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

        {/* KPI 2 */}
        <div className="bg-white rounded-2xl p-5 border border-[#2F5D3A]/15 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#C96F4A]/10 text-[#C96F4A] flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
              Pending Orders
            </span>
            <h3 className="font-display text-2xl font-bold text-[#232323] font-mono tabular-nums">
              6 pickups
            </h3>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white rounded-2xl p-5 border border-[#2F5D3A]/15 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-[#2F5D3A] flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
              Est. In-Person Total
            </span>
            <h3 className="font-display text-2xl font-bold text-[#2F5D3A] font-mono tabular-nums">
              $168.00
            </h3>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-white rounded-2xl p-5 border border-[#2F5D3A]/15 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
              Market Pickup Day
            </span>
            <h3 className="font-display text-lg font-bold text-[#232323]">
              Saturday 7:00 AM
            </h3>
          </div>
        </div>
      </div>

      {/* Add / Edit Product Form (Mobile-Friendly) */}
      {isAddingProduct && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-[#2F5D3A]/30 shadow-md animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-stone-100">
            <div>
              <h3 className="font-display text-xl font-bold text-[#2F5D3A]">
                {editingProduct ? `Edit "${editingProduct.name}"` : 'Add New Market Item'}
              </h3>
              <p className="text-xs text-stone-500">
                Changes update your public market booth immediately.
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
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Heirloom Yellow Plum Tomatoes"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs text-[#232323] focus:outline-none focus:ring-2 focus:ring-[#2F5D3A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Category *
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs text-[#232323] focus:outline-none focus:ring-2 focus:ring-[#2F5D3A]"
                >
                  <option value="Produce">Produce</option>
                  <option value="Bakery">Bakery</option>
                  <option value="Honey & Preserves">Honey & Preserves</option>
                  <option value="Dairy & Cheese">Dairy & Cheese</option>
                  <option value="Meats & Dairy">Meats & Dairy</option>
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
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
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
                  value={formUnit}
                  onChange={(e) => setFormUnit(e.target.value)}
                  placeholder="dozen, basket, lb, loaf"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs text-[#232323] focus:outline-none focus:ring-2 focus:ring-[#2F5D3A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Photo Asset Preset
                </label>
                <select
                  value={formImage}
                  onChange={(e) => setFormImage(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs text-[#232323] focus:outline-none focus:ring-2 focus:ring-[#2F5D3A]"
                >
                  <option value={ASSET_IMAGES.produce}>Fresh Produce Crate</option>
                  <option value={ASSET_IMAGES.bakery}>Artisan Hearth Bread</option>
                  <option value={ASSET_IMAGES.preserves}>Maple & Wildflower Honey</option>
                  <option value={ASSET_IMAGES.hero}>Market Morning Stall</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Description & Tasting Notes
              </label>
              <textarea
                rows={2}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Where was it harvested? Variety, flavor characteristics, or preparation tips."
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs text-[#232323] focus:outline-none focus:ring-2 focus:ring-[#2F5D3A]"
              />
            </div>

            {/* Availability Toggle */}
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
                onClick={() => setFormIsAvailable(!formIsAvailable)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  formIsAvailable ? 'bg-[#2F5D3A]' : 'bg-stone-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    formIsAvailable ? 'translate-x-6' : 'translate-x-1'
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
                className="px-5 py-2 rounded-xl bg-[#2F5D3A] text-white text-xs font-bold hover:bg-[#22442A] transition-colors shadow-xs"
              >
                {editingProduct ? 'Save Product Changes' : 'Publish to Market Stall'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Product List with Edit, Delete, Toggle */}
      <div className="bg-white rounded-3xl border border-[#2F5D3A]/15 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold text-[#2F5D3A]">
              My Product Catalogue ({myProducts.length})
            </h2>
            <p className="text-xs text-stone-500">
              Edits update the public booth in real time for customer pre-orders.
            </p>
          </div>

          <div className="text-xs text-stone-500 font-medium">
            Pickup location: <strong className="text-[#232323]">St. Jacobs Booth #42</strong>
          </div>
        </div>

        {myProducts.length > 0 ? (
          <div className="divide-y divide-stone-100">
            {myProducts.map((product) => (
              <div
                key={product.id}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#FAF6EE]/40 transition-colors"
              >
                {/* Product thumb & title */}
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-stone-100 overflow-hidden shrink-0 border border-stone-200">
                    <img
                      src={product.image}
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

                {/* Status Toggle & Actions */}
                <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                  {/* Availability pill button */}
                  <button
                    onClick={() => toggleAvailability(product.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      product.isAvailable !== false
                        ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                        : 'bg-stone-200 text-stone-700 hover:bg-stone-300'
                    }`}
                    title="Click to toggle availability"
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        product.isAvailable !== false ? 'bg-emerald-600' : 'bg-stone-500'
                      }`}
                    />
                    <span>{product.isAvailable !== false ? 'Available' : 'Sold Out'}</span>
                  </button>

                  {/* Edit button */}
                  <button
                    onClick={() => startEdit(product)}
                    className="p-2 text-stone-600 hover:text-[#2F5D3A] hover:bg-stone-100 rounded-xl transition-colors"
                    title="Edit item"
                    aria-label={`Edit ${product.name}`}
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  {/* Delete button */}
                  <button
                    onClick={() => handleDeleteProduct(product.id, product.name)}
                    className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
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
              Click the "Add New Item" button above to publish your first market item.
            </p>
            <button
              onClick={() => setIsAddingProduct(true)}
              className="px-4 py-2 rounded-xl bg-[#2F5D3A] text-white text-xs font-bold"
            >
              Add First Item
            </button>
          </div>
        )}
      </div>

      {/* Pre-Orders & Pickup Management Placeholder */}
      <div className="bg-[#FAF6EE] rounded-3xl p-6 sm:p-8 border border-[#2F5D3A]/20 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-xl font-bold text-[#2F5D3A]">
              Saturday Morning Pre-Order Batch
            </h3>
            <p className="text-xs text-stone-600">
              Customer reservations to assemble in brown paper baskets before 7:00 AM.
            </p>
          </div>
          <span className="text-xs font-bold text-[#C96F4A] bg-white px-3 py-1 rounded-full border border-[#C96F4A]/30">
            Pay in person at pickup
          </span>
        </div>

        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF6EE] text-[#2F5D3A] font-bold border-b border-stone-200">
              <tr>
                <th className="py-3 px-4">Order #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Reserved Items</th>
                <th className="py-3 px-4">Total Due</th>
                <th className="py-3 px-4">Pickup Window</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              <tr className="hover:bg-stone-50">
                <td className="py-3 px-4 font-mono font-bold text-[#232323]">ORD-8941</td>
                <td className="py-3 px-4 font-medium">Claire Dubois</td>
                <td className="py-3 px-4 text-stone-600">2× Sweet Corn, 3× Heritage Tomatoes</td>
                <td className="py-3 px-4 font-mono font-bold text-[#2F5D3A]">$28.50</td>
                <td className="py-3 px-4 text-stone-500">Sat 8:30 AM – 10:00 AM</td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    Boxed & Ready
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-stone-50">
                <td className="py-3 px-4 font-mono font-bold text-[#232323]">ORD-8812</td>
                <td className="py-3 px-4 font-medium">Marcus Tremblay</td>
                <td className="py-3 px-4 text-stone-600">1× Sourdough Loaf, 1× Clover Honey</td>
                <td className="py-3 px-4 font-mono font-bold text-[#2F5D3A]">$19.50</td>
                <td className="py-3 px-4 text-stone-500">Sat 9:00 AM – 10:30 AM</td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                    Pending Morning Pack
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

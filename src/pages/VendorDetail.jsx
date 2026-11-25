/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Store,
  MapPin,
  Star,
  Heart,
  ShoppingBag,
  ArrowLeft,
  CheckCircle2,
  MessageSquare,
  ShieldCheck,
  Send,
  AlertCircle,
} from 'lucide-react';
import { fetchVendorDetail } from '../data.js';
import { apiRequest } from '../lib/supabase.js';
import ProductCard from '../components/ProductCard.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function VendorDetail() {
  const { id } = useParams();
  const { isAuthenticated, accessToken, isFavourite, toggleFavourite, orders } = useAuth();
  const { addToast } = useToast();

  const [vendor, setVendor] = useState(null);
  const [market, setMarket] = useState(null);
  const [products, setProducts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const [showReviewForm, setShowReviewForm] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setErrorMsg('');

    fetchVendorDetail(id)
      .then((res) => {
        if (!active) return;
        if (!res) {
          setErrorMsg('Vendor stall not found.');
          return;
        }
        setVendor(res.vendor);
        setMarket(res.market);
        setProducts(res.products);
        setReviews(res.reviews);
      })
      .catch((err) => {
        if (!active) return;
        setErrorMsg(err.message || 'Failed to load vendor stall.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  // Eligible completed orders by the signed-in user that haven't been reviewed yet
  const eligibleOrders = useMemo(() => {
    if (!vendor || !isAuthenticated) return [];
    const reviewedOrderIds = new Set(reviews.map((r) => r.orderId).filter(Boolean));
    return orders.filter(
      (o) =>
        o.vendorId === vendor.id &&
        o.status === 'completed' &&
        !reviewedOrderIds.has(o.id)
    );
  }, [orders, reviews, vendor, isAuthenticated]);

  useEffect(() => {
    if (eligibleOrders.length > 0 && !selectedOrderId) {
      setSelectedOrderId(eligibleOrders[0].id);
    }
  }, [eligibleOrders, selectedOrderId]);

  const categories = useMemo(() => {
    return ['all', ...Array.from(new Set(products.map((p) => p.category || 'General')))];
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'all') return products;
    return products.filter((p) => p.category === selectedCategory);
  }, [products, selectedCategory]);

  const isFav = vendor ? isFavourite(vendor.id) : false;

  const handleToggleFav = async () => {
    if (!vendor) return;
    if (!isAuthenticated) {
      addToast('Log in to save favourite stalls.', 'info');
      return;
    }
    try {
      const saved = await toggleFavourite(vendor.id, 'vendor');
      addToast(saved ? `Added ${vendor.name} to favourites!` : `Removed ${vendor.name} from favourites`);
    } catch (err) {
      addToast(err.message || 'Could not update favourites.', 'error');
    }
  };

  const handleAddReview = async (e) => {
    e.preventDefault();
    if (!accessToken || !vendor) {
      addToast('Please log in to leave a review.', 'info');
      return;
    }
    if (!selectedOrderId) {
      addToast('Reviews require a completed pickup order with this vendor.', 'error');
      return;
    }
    if (!newComment.trim()) {
      addToast('Please enter your review comments.', 'error');
      return;
    }

    setSubmittingReview(true);
    try {
      const res = await apiRequest(
        '/api/reviews',
        {
          method: 'POST',
          body: JSON.stringify({
            vendorId: vendor.id,
            orderId: selectedOrderId,
            rating: newRating,
            comment: newComment.trim(),
          }),
        },
        accessToken
      );

      setReviews((prev) => [res.review, ...prev]);
      setNewComment('');
      setShowReviewForm(false);
      addToast('Verified review published! Thank you for supporting local growers.');
    } catch (err) {
      addToast(err.message || 'Could not submit review.', 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="h-72 rounded-3xl bg-white border border-stone-200 animate-pulse" />
        <div className="h-64 rounded-3xl bg-white border border-stone-200 animate-pulse" />
      </div>
    );
  }

  if (errorMsg || !vendor) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-[#C96F4A] mx-auto" />
        <h1 className="font-display text-2xl font-bold text-[#2F5D3A]">
          {errorMsg || 'Vendor not found'}
        </h1>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2F5D3A] text-white text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Markets</span>
        </Link>
      </div>
    );
  }

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : vendor.rating.toFixed(1);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      <div>
        <Link
          to={market ? `/markets/${market.id}` : '/'}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-[#2F5D3A] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to {market ? market.name : 'Markets'}</span>
        </Link>
      </div>

      {/* Vendor Profile Header Banner */}
      <div className="bg-white rounded-3xl border border-[#2F5D3A]/15 overflow-hidden shadow-xs">
        <div className="relative h-56 sm:h-72 w-full bg-stone-200">
          <img
            src={vendor.bannerImage || vendor.image}
            alt={vendor.name}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

          <div className="absolute top-4 right-4">
            <button
              onClick={handleToggleFav}
              className={`p-2.5 rounded-full backdrop-blur-md transition-all shadow-md ${
                isFav
                  ? 'bg-[#C96F4A] text-white'
                  : 'bg-white/90 text-stone-700 hover:text-[#C96F4A] hover:bg-white'
              }`}
              aria-label={isFav ? 'Remove from favourites' : 'Save to favourites'}
            >
              <Heart className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
            </button>
          </div>

          <div className="absolute bottom-6 left-6 right-6 text-white max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-3 py-0.5 rounded-full bg-[#C96F4A] text-white text-[11px] font-bold uppercase tracking-wider">
                {vendor.category}
              </span>
              <div className="flex items-center gap-1 bg-white/20 backdrop-blur-md px-2.5 py-0.5 rounded-full text-xs font-bold text-white">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>{avgRating}</span>
                <span className="text-stone-300 font-normal">({reviews.length} reviews)</span>
              </div>
            </div>

            <h1 className="font-display text-2xl sm:text-4xl font-bold leading-tight drop-shadow-sm">
              {vendor.name}
            </h1>

            <p className="flex items-center gap-1.5 text-xs sm:text-sm text-stone-200 mt-2">
              <MapPin className="w-4 h-4 text-[#C96F4A] shrink-0" />
              <span>Attending: </span>
              {market ? (
                <Link
                  to={`/markets/${market.id}`}
                  className="font-semibold text-white underline hover:text-[#FAF6EE]"
                >
                  {market.name}
                </Link>
              ) : (
                <span className="font-semibold text-white">{vendor.marketName}</span>
              )}
              <span className="text-stone-400">· {vendor.city}</span>
            </p>
          </div>
        </div>

        <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-3 gap-6 bg-[#FAF6EE]/40 border-t border-stone-100">
          <div className="md:col-span-2 space-y-3">
            <h3 className="font-display font-bold text-lg text-[#2F5D3A]">
              About Our Farm & Kitchen
            </h3>
            <p className="text-sm text-stone-700 leading-relaxed">
              {vendor.fullDescription || vendor.shortDescription}
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-[#2F5D3A]/20 shadow-xs space-y-2">
            <span className="text-[11px] font-bold text-[#C96F4A] uppercase tracking-wider block">
              Pickup Instructions
            </span>
            <p className="text-xs font-semibold text-[#2F5D3A] flex items-center gap-1.5">
              <Store className="w-4 h-4 text-[#C96F4A] shrink-0" />
              {vendor.stallLocation}
            </p>
            <p className="text-xs text-stone-600 leading-relaxed">{vendor.pickupInstructions}</p>
            <div className="pt-1 text-[11px] font-medium text-stone-500">
              Payment: Cash, Debit, or e-Transfer at stall.
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Inventory Section */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#2F5D3A]/10">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#2F5D3A]">
              Weekly Inventory ({filteredProducts.length})
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 mt-0.5">
              Freshly harvested & packaged for your upcoming market day
            </p>
          </div>

          {categories.length > 2 && (
            <div className="flex items-center gap-1.5 p-1 bg-white rounded-xl border border-stone-200 overflow-x-auto">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors capitalize ${
                    selectedCategory === cat
                      ? 'bg-[#2F5D3A] text-[#FAF6EE] shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  {cat === 'all' ? 'All Items' : cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                vendor={vendor}
                market={market || { id: vendor.marketId, name: vendor.marketName }}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-stone-300 p-6">
            <ShoppingBag className="w-10 h-10 text-stone-400 mx-auto mb-2" />
            <h4 className="font-display font-bold text-stone-700">No items in this category</h4>
            <p className="text-xs text-stone-500 mt-1">
              Select "All Items" to browse all current farm goods.
            </p>
          </div>
        )}
      </section>

      {/* Verified Completed-Order Reviews */}
      <section className="bg-white rounded-3xl p-6 sm:p-8 border border-[#2F5D3A]/15 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-xl sm:text-2xl font-bold text-[#2F5D3A]">
                Customer Reviews
              </h3>
              <span className="flex items-center gap-1 text-xs font-bold text-[#C96F4A] bg-[#FAF6EE] px-2.5 py-0.5 rounded-full border border-[#C96F4A]/30">
                <ShieldCheck className="w-3.5 h-3.5" />
                Verified Completed Orders Only
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-1">
              Average {avgRating} / 5.0 based on verified in-person pickup orders
            </p>
          </div>

          {eligibleOrders.length > 0 ? (
            <button
              onClick={() => setShowReviewForm(!showReviewForm)}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#2F5D3A] text-[#FAF6EE] text-xs font-semibold hover:bg-[#22442A] transition-colors shadow-xs"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{showReviewForm ? 'Cancel' : 'Leave a Review'}</span>
            </button>
          ) : (
            <span className="text-xs text-stone-500 italic">
              {isAuthenticated
                ? 'Complete an in-person pickup order with this stall to leave a verified review.'
                : 'Sign in after completing a pickup order to leave a verified review.'}
            </span>
          )}
        </div>

        {showReviewForm && eligibleOrders.length > 0 && (
          <form
            onSubmit={handleAddReview}
            className="p-5 rounded-2xl bg-[#FAF6EE] border border-[#2F5D3A]/20 space-y-4"
          >
            <h4 className="font-display font-bold text-sm text-[#2F5D3A]">
              Write a Verified Review for {vendor.name}
            </h4>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Completed Order
              </label>
              <select
                value={selectedOrderId}
                onChange={(e) => setSelectedOrderId(e.target.value)}
                className="w-full p-2.5 text-xs bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2F5D3A]"
              >
                {eligibleOrders.map((o) => (
                  <option key={o.id} value={o.id}>
                    #{o.id} · {o.date} (${o.total.toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Your Rating (1 to 5 Stars)
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setNewRating(star)}
                    className="p-1 focus:outline-none"
                  >
                    <Star
                      className={`w-6 h-6 transition-colors ${
                        star <= newRating ? 'fill-amber-400 text-amber-400' : 'text-stone-300'
                      }`}
                    />
                  </button>
                ))}
                <span className="text-xs font-bold text-[#232323] ml-2">
                  {newRating} / 5 Stars
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Your Review & Pickup Experience
              </label>
              <textarea
                rows={3}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="How was the harvest quality? Was pickup at the stall swift?"
                className="w-full p-3 text-xs bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2F5D3A]"
                required
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-stone-500">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#2F5D3A]" />
                Verified against order #{selectedOrderId}
              </span>
              <button
                type="submit"
                disabled={submittingReview}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2F5D3A] text-white text-xs font-bold hover:bg-[#22442A] disabled:opacity-50"
              >
                <Send className="w-3 h-3" />
                <span>{submittingReview ? 'Posting...' : 'Post Review'}</span>
              </button>
            </div>
          </form>
        )}

        <div className="space-y-4">
          {reviews.length > 0 ? (
            reviews.map((rev) => (
              <div
                key={rev.id}
                className="p-5 rounded-2xl bg-[#FAF6EE]/50 border border-stone-100 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-[#232323]">
                      {rev.customerName}
                    </span>
                    <span className="text-[11px] bg-[#2F5D3A]/10 text-[#2F5D3A] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-[#2F5D3A]" />
                      Completed order
                    </span>
                  </div>
                  <span className="text-xs text-stone-400 font-medium">{rev.date}</span>
                </div>

                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < rev.rating ? 'fill-amber-400 text-amber-400' : 'text-stone-300'
                      }`}
                    />
                  ))}
                  <span className="text-xs font-mono font-bold text-stone-600 ml-1">
                    {rev.rating}.0
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-stone-700 leading-relaxed pt-1">
                  "{rev.comment}"
                </p>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-xs text-stone-500">
              No reviews yet for this vendor. Be the first to leave one after your pickup!
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import heroImg from './assets/images/hero_farmers_market_1793389204533.jpg';
import produceImg from './assets/images/market_fresh_produce_1793389203550.jpg';
import breadImg from './assets/images/artisan_sourdough_bread_1793389204722.jpg';
import honeyImg from './assets/images/maple_honey_preserves_1793389204233.jpg';
import { supabase, isSupabaseConfigured } from './lib/supabase.js';

export const ASSET_IMAGES = {
  hero: heroImg,
  produce: produceImg,
  bakery: breadImg,
  preserves: honeyImg,
};

export function resolveAssetImage(imageKeyOrUrl) {
  if (!imageKeyOrUrl) return produceImg;
  if (ASSET_IMAGES[imageKeyOrUrl]) return ASSET_IMAGES[imageKeyOrUrl];
  if (typeof imageKeyOrUrl === 'string' && imageKeyOrUrl.startsWith('https://')) {
    return imageKeyOrUrl;
  }
  return produceImg;
}

function mapMarketRow(row, vendorCount = 0) {
  const rawAnnouncement = row.announcement || null;
  const announcement = rawAnnouncement
    ? {
        ...rawAnnouncement,
        image: resolveAssetImage(rawAnnouncement.imageKey || rawAnnouncement.image),
      }
    : null;

  return {
    id: row.id,
    name: row.name,
    city: row.city,
    region: row.region,
    address: row.address,
    lat: Number(row.lat),
    lng: Number(row.lng),
    season: row.season,
    hoursTable: Array.isArray(row.hours_table) ? row.hours_table : [],
    summaryHours: row.summary_hours,
    description: row.description,
    announcement,
    vendorCount,
    heroImage: resolveAssetImage(row.hero_image_key),
  };
}

function mapVendorRow(row, ratingStats = { rating: 5.0, reviewCount: 0 }) {
  const market = row.markets || null;
  return {
    id: row.id,
    ownerUserId: row.owner_user_id || null,
    name: row.name,
    marketId: row.market_id,
    marketName: market?.name || row.market_id,
    city: row.city,
    category: row.category,
    shortDescription: row.short_description,
    fullDescription: row.full_description,
    stallLocation: row.stall_location,
    pickupInstructions: row.pickup_instructions,
    image: resolveAssetImage(row.image_key),
    bannerImage: resolveAssetImage(row.banner_image_key || row.image_key),
    isApproved: Boolean(row.is_approved),
    rating: ratingStats.rating,
    reviewCount: ratingStats.reviewCount,
  };
}

export function mapProductRow(row) {
  return {
    id: row.id,
    vendorId: row.vendor_id,
    name: row.name,
    price: Number(row.price_cents) / 100,
    priceCents: Number(row.price_cents),
    unit: row.unit,
    category: row.category,
    description: row.description || '',
    isAvailable: row.is_available !== false,
    imageKey: row.image_key || 'produce',
    image: resolveAssetImage(row.image_key),
  };
}

function mapReviewRow(row) {
  const created = row.created_at ? String(row.created_at).split('T')[0] : 'Recent';
  return {
    id: row.id,
    vendorId: row.vendor_id,
    orderId: row.order_id || null,
    customerId: row.customer_id || null,
    customerName: row.customer_name,
    verifiedOrder: true,
    date: created,
    rating: Number(row.rating),
    comment: row.comment,
  };
}

function ensureClient() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(
      'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment.'
    );
  }
  return supabase;
}

async function computeVendorRatingMap(client, vendorIds = null) {
  let query = client.from('reviews').select('vendor_id, rating');
  if (Array.isArray(vendorIds) && vendorIds.length > 0) {
    query = query.in('vendor_id', vendorIds);
  }
  const { data } = await query;
  const agg = new Map();
  for (const row of data || []) {
    const entry = agg.get(row.vendor_id) || { sum: 0, count: 0 };
    entry.sum += Number(row.rating);
    entry.count += 1;
    agg.set(row.vendor_id, entry);
  }
  const result = new Map();
  for (const [vId, entry] of agg.entries()) {
    result.set(vId, {
      rating: Number((entry.sum / entry.count).toFixed(1)),
      reviewCount: entry.count,
    });
  }
  return result;
}

export async function fetchMarkets() {
  const client = ensureClient();
  const [{ data: markets, error: mErr }, { data: vendors, error: vErr }] = await Promise.all([
    client.from('markets').select('*').order('name', { ascending: true }),
    client.from('vendors').select('id, market_id').eq('is_approved', true),
  ]);

  if (mErr) throw new Error(mErr.message);
  if (vErr) throw new Error(vErr.message);

  const countByMarket = new Map();
  for (const v of vendors || []) {
    countByMarket.set(v.market_id, (countByMarket.get(v.market_id) || 0) + 1);
  }

  return (markets || []).map((row) => mapMarketRow(row, countByMarket.get(row.id) || 0));
}

export async function fetchMarketById(marketId) {
  const client = ensureClient();
  const { data: market, error: mErr } = await client
    .from('markets')
    .select('*')
    .eq('id', marketId)
    .maybeSingle();

  if (mErr) throw new Error(mErr.message);
  if (!market) return null;

  const { data: vendors, error: vErr } = await client
    .from('vendors')
    .select('*, markets ( name )')
    .eq('market_id', marketId)
    .eq('is_approved', true)
    .order('name', { ascending: true });

  if (vErr) throw new Error(vErr.message);

  const vendorIds = (vendors || []).map((v) => v.id);
  const ratingMap = await computeVendorRatingMap(client, vendorIds);

  return {
    market: mapMarketRow(market, (vendors || []).length),
    vendors: (vendors || []).map((v) =>
      mapVendorRow(v, ratingMap.get(v.id) || { rating: 5.0, reviewCount: 0 })
    ),
  };
}

export async function fetchVendors() {
  const client = ensureClient();
  const { data: vendors, error } = await client
    .from('vendors')
    .select('*, markets ( name )')
    .eq('is_approved', true)
    .order('name', { ascending: true });

  if (error) throw new Error(error.message);

  const ratingMap = await computeVendorRatingMap(client);
  return (vendors || []).map((v) =>
    mapVendorRow(v, ratingMap.get(v.id) || { rating: 5.0, reviewCount: 0 })
  );
}

export async function fetchVendorDetail(vendorId) {
  const client = ensureClient();
  const { data: vendor, error: vErr } = await client
    .from('vendors')
    .select('*, markets ( * )')
    .eq('id', vendorId)
    .maybeSingle();

  if (vErr) throw new Error(vErr.message);
  if (!vendor) return null;

  const [{ data: products, error: pErr }, { data: reviews, error: rErr }] = await Promise.all([
    client.from('products').select('*').eq('vendor_id', vendorId).order('created_at', { ascending: false }),
    client.from('reviews').select('*').eq('vendor_id', vendorId).order('created_at', { ascending: false }),
  ]);

  if (pErr) throw new Error(pErr.message);
  if (rErr) throw new Error(rErr.message);

  const mappedReviews = (reviews || []).map(mapReviewRow);
  const ratingStats =
    mappedReviews.length > 0
      ? {
          rating: Number(
            (
              mappedReviews.reduce((sum, r) => sum + r.rating, 0) / mappedReviews.length
            ).toFixed(1)
          ),
          reviewCount: mappedReviews.length,
        }
      : { rating: 5.0, reviewCount: 0 };

  return {
    vendor: mapVendorRow(vendor, ratingStats),
    market: vendor.markets ? mapMarketRow(vendor.markets) : null,
    products: (products || []).map(mapProductRow),
    reviews: mappedReviews,
  };
}

export async function fetchProductsByVendor(vendorId) {
  const client = ensureClient();
  const { data, error } = await client
    .from('products')
    .select('*')
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []).map(mapProductRow);
}

export async function searchCatalog(queryText) {
  const client = ensureClient();
  const clean = (queryText || '').trim().toLowerCase();
  if (!clean) {
    return { markets: [], products: [], vendorsById: {}, marketsById: {} };
  }

  const [markets, vendors, { data: productRows, error: pErr }] = await Promise.all([
    fetchMarkets(),
    fetchVendors(),
    client.from('products').select('*').order('created_at', { ascending: false }),
  ]);

  if (pErr) throw new Error(pErr.message);

  const matchingMarkets = markets.filter(
    (m) =>
      m.name.toLowerCase().includes(clean) ||
      m.city.toLowerCase().includes(clean) ||
      m.region.toLowerCase().includes(clean) ||
      m.description.toLowerCase().includes(clean)
  );

  const vendorsById = Object.fromEntries(vendors.map((v) => [v.id, v]));
  const marketsById = Object.fromEntries(markets.map((m) => [m.id, m]));

  const matchingProducts = (productRows || [])
    .map(mapProductRow)
    .filter(
      (p) =>
        p.name.toLowerCase().includes(clean) ||
        p.category.toLowerCase().includes(clean) ||
        p.description.toLowerCase().includes(clean)
    );

  return {
    markets: matchingMarkets,
    products: matchingProducts,
    vendorsById,
    marketsById,
  };
}

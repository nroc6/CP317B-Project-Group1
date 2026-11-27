/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Public catalog reads (markets, approved vendors, products, reviews) straight from Supabase; protected by RLS.

import heroImg from './assets/images/hero_farmers_market_1793389204533.jpg';
import produceImg from './assets/images/market_fresh_produce_1793389203550.jpg';
import breadImg from './assets/images/artisan_sourdough_bread_1793389204722.jpg';
import honeyImg from './assets/images/maple_honey_preserves_1793389204233.jpg';
import { supabase, isSupabaseConfigured } from './lib/supabase.js';

// Image keys stored in the DB, mapped to bundled assets (keep in sync with ALLOWED_IMAGE_KEYS on the server).
export const ASSET_IMAGES = {
  hero: heroImg,
  produce: produceImg,
  bakery: breadImg,
  preserves: honeyImg,
};

// Rating shown for vendors that have no reviews yet.
const DEFAULT_RATING = { rating: 5.0, reviewCount: 0 };

// Turns an image key (or https URL) into a usable src, defaulting to the produce photo.
export function resolveAssetImage(imageKeyOrUrl) {
  if (!imageKeyOrUrl) return produceImg;
  if (ASSET_IMAGES[imageKeyOrUrl]) return ASSET_IMAGES[imageKeyOrUrl];
  if (typeof imageKeyOrUrl === 'string' && imageKeyOrUrl.startsWith('https://')) {
    return imageKeyOrUrl;
  }
  return produceImg;
}

// Converts a markets row into the client shape.
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

// Converts a vendors row (optionally joined with markets) into the client shape.
function mapVendorRow(row, ratingStats = DEFAULT_RATING) {
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

// Converts a products row (integer cents) into the client shape (dollar price + image src).
function mapProductRow(row) {
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

// Converts a reviews row into the client shape.
function mapReviewRow(row) {
  return {
    id: row.id,
    vendorId: row.vendor_id,
    orderId: row.order_id || null,
    customerId: row.customer_id || null,
    customerName: row.customer_name,
    verifiedOrder: true,
    date: row.created_at ? String(row.created_at).split('T')[0] : 'Recent',
    rating: Number(row.rating),
    comment: row.comment,
  };
}

// Returns the Supabase client, or throws a friendly error when env vars are missing.
function ensureClient() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(
      'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment.'
    );
  }
  return supabase;
}

// Throws the Supabase error (if any) so callers can just await the query.
function throwIfError(error) {
  if (error) throw new Error(error.message);
}

// Averages a list of numeric ratings into { rating (1 decimal), reviewCount }.
function summarizeRatings(ratings) {
  if (ratings.length === 0) return DEFAULT_RATING;
  const average = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
  return { rating: Number(average.toFixed(1)), reviewCount: ratings.length };
}

// Builds a vendorId → rating summary map, optionally limited to some vendors.
async function computeVendorRatingMap(client, vendorIds = null) {
  let query = client.from('reviews').select('vendor_id, rating');
  if (Array.isArray(vendorIds) && vendorIds.length > 0) {
    query = query.in('vendor_id', vendorIds);
  }
  const { data } = await query;

  const ratingsByVendor = new Map();
  for (const row of data || []) {
    const list = ratingsByVendor.get(row.vendor_id) || [];
    list.push(Number(row.rating));
    ratingsByVendor.set(row.vendor_id, list);
  }

  const result = new Map();
  for (const [vendorId, ratings] of ratingsByVendor.entries()) {
    result.set(vendorId, summarizeRatings(ratings));
  }
  return result;
}

// Lists all markets with a count of their approved vendors.
export async function fetchMarkets() {
  const client = ensureClient();
  const [{ data: markets, error: mErr }, { data: vendors, error: vErr }] = await Promise.all([
    client.from('markets').select('*').order('name', { ascending: true }),
    client.from('vendors').select('id, market_id').eq('is_approved', true),
  ]);
  throwIfError(mErr);
  throwIfError(vErr);

  const countByMarket = new Map();
  for (const v of vendors || []) {
    countByMarket.set(v.market_id, (countByMarket.get(v.market_id) || 0) + 1);
  }

  return (markets || []).map((row) => mapMarketRow(row, countByMarket.get(row.id) || 0));
}

// Loads one market and its approved vendors (with ratings); null if not found.
export async function fetchMarketById(marketId) {
  const client = ensureClient();
  const { data: market, error: mErr } = await client
    .from('markets')
    .select('*')
    .eq('id', marketId)
    .maybeSingle();
  throwIfError(mErr);
  if (!market) return null;

  const { data: vendors, error: vErr } = await client
    .from('vendors')
    .select('*, markets ( name )')
    .eq('market_id', marketId)
    .eq('is_approved', true)
    .order('name', { ascending: true });
  throwIfError(vErr);

  const vendorRows = vendors || [];
  const ratingMap = await computeVendorRatingMap(client, vendorRows.map((v) => v.id));

  return {
    market: mapMarketRow(market, vendorRows.length),
    vendors: vendorRows.map((v) => mapVendorRow(v, ratingMap.get(v.id) || DEFAULT_RATING)),
  };
}

// Lists every approved vendor with its rating.
export async function fetchVendors() {
  const client = ensureClient();
  const { data: vendors, error } = await client
    .from('vendors')
    .select('*, markets ( name )')
    .eq('is_approved', true)
    .order('name', { ascending: true });
  throwIfError(error);

  const ratingMap = await computeVendorRatingMap(client);
  return (vendors || []).map((v) => mapVendorRow(v, ratingMap.get(v.id) || DEFAULT_RATING));
}

// Loads a vendor page: vendor, its market, products and reviews; null if not found.
export async function fetchVendorDetail(vendorId) {
  const client = ensureClient();
  const { data: vendor, error: vErr } = await client
    .from('vendors')
    .select('*, markets ( * )')
    .eq('id', vendorId)
    .maybeSingle();
  throwIfError(vErr);
  if (!vendor) return null;

  const [{ data: products, error: pErr }, { data: reviews, error: rErr }] = await Promise.all([
    client.from('products').select('*').eq('vendor_id', vendorId).order('created_at', { ascending: false }),
    client.from('reviews').select('*').eq('vendor_id', vendorId).order('created_at', { ascending: false }),
  ]);
  throwIfError(pErr);
  throwIfError(rErr);

  const mappedReviews = (reviews || []).map(mapReviewRow);

  return {
    vendor: mapVendorRow(vendor, summarizeRatings(mappedReviews.map((r) => r.rating))),
    market: vendor.markets ? mapMarketRow(vendor.markets) : null,
    products: (products || []).map(mapProductRow),
    reviews: mappedReviews,
  };
}

// Lists a vendor's products, newest first (used by the vendor dashboard).
export async function fetchProductsByVendor(vendorId) {
  const client = ensureClient();
  const { data, error } = await client
    .from('products')
    .select('*')
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false });
  throwIfError(error);
  return (data || []).map(mapProductRow);
}

// Case-insensitive substring search over markets and products (filtered client-side).
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
  throwIfError(pErr);

  const matches = (...fields) => fields.some((f) => (f || '').toLowerCase().includes(clean));

  return {
    markets: markets.filter((m) => matches(m.name, m.city, m.region, m.description)),
    products: (productRows || [])
      .map(mapProductRow)
      .filter((p) => matches(p.name, p.category, p.description)),
    vendorsById: Object.fromEntries(vendors.map((v) => [v.id, v])),
    marketsById: Object.fromEntries(markets.map((m) => [m.id, m])),
  };
}

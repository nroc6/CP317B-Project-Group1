/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { requireSupabaseAdmin } from '../supabaseAdmin.ts';
import { type Actor, DomainError, cleanString } from './types.ts';

// Must stay in sync with the image/category options in the vendor dashboard UI.
const ALLOWED_IMAGE_KEYS = new Set(['produce', 'bakery', 'preserves', 'hero']);
const ALLOWED_CATEGORIES = new Set([
  'Produce',
  'Bakery',
  'Honey & Preserves',
  'Dairy & Cheese',
  'Meats & Dairy',
]);

export interface ProductInput {
  name: string;
  price: number;
  unit: string;
  category: string;
  description?: string;
  isAvailable?: boolean;
  imageKey?: string;
}

// Converts a products DB row (integer cents) into the client shape (dollar price).
export function serializeProduct(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    vendorId: row.vendor_id as string,
    name: row.name as string,
    price: Number(row.price_cents) / 100,
    priceCents: Number(row.price_cents),
    unit: row.unit as string,
    category: row.category as string,
    description: (row.description as string) || '',
    isAvailable: Boolean(row.is_available),
    imageKey: (row.image_key as string) || 'produce',
    createdAt: row.created_at as string,
  };
}

// Throws unless the actor is an approved vendor; returns their vendor ID.
function assertApprovedVendor(actor: Actor): string {
  if (actor.role !== 'vendor' || !actor.vendorId) {
    throw new DomainError('Only vendor accounts can manage stall inventory.', 403);
  }
  if (!actor.isApproved) {
    throw new DomainError(
      'Your vendor stall is pending admin approval before publishing products.',
      403
    );
  }
  return actor.vendorId;
}

// Validates client input into DB columns; on update, only fields that were sent are included.
function validateProductFields(input: Partial<ProductInput>, isCreate: boolean) {
  const clean: Record<string, unknown> = {};
  const has = (field: keyof ProductInput) => isCreate || input[field] !== undefined;

  if (has('name')) {
    const name = cleanString(input.name);
    if (!name || name.length > 120) {
      throw new DomainError('Product name is required (max 120 characters).', 400);
    }
    clean.name = name;
  }

  if (has('price')) {
    const price = Number(input.price);
    if (!Number.isFinite(price) || price <= 0 || price > 10000) {
      throw new DomainError('Product price must be a positive number.', 400);
    }
    clean.price_cents = Math.round(price * 100);
  }

  if (has('unit')) {
    const unit = cleanString(input.unit);
    if (!unit || unit.length > 50) {
      throw new DomainError('Unit is required (max 50 characters).', 400);
    }
    clean.unit = unit;
  }

  // Unknown categories / image keys fall back to safe defaults instead of erroring.
  if (has('category')) {
    const category = cleanString(input.category, 'Produce');
    clean.category = ALLOWED_CATEGORIES.has(category) ? category : 'Produce';
  }

  if (has('description')) {
    const description = cleanString(input.description);
    if (description.length > 1000) {
      throw new DomainError('Description must be under 1000 characters.', 400);
    }
    clean.description = description;
  }

  if (has('isAvailable')) {
    clean.is_available = input.isAvailable !== false;
  }

  if (has('imageKey')) {
    const key = cleanString(input.imageKey, 'produce');
    clean.image_key = ALLOWED_IMAGE_KEYS.has(key) ? key : 'produce';
  }

  return clean;
}

// Loads a product and throws 404/403 unless it belongs to the given vendor.
async function fetchOwnedProduct(productId: string, vendorId: string) {
  const db = requireSupabaseAdmin();
  const { data: existing, error } = await db
    .from('products')
    .select('*')
    .eq('id', productId)
    .maybeSingle();

  if (error) {
    throw new DomainError(error.message, 500);
  }
  if (!existing) {
    throw new DomainError('Product not found.', 404);
  }
  if (existing.vendor_id !== vendorId) {
    throw new DomainError('You do not own this product.', 403);
  }
  return existing as Record<string, unknown>;
}

export const ProductModel = {
  // Adds a new product to the actor's stall.
  async create(input: ProductInput, actor: Actor) {
    const vendorId = assertApprovedVendor(actor);
    const fields = validateProductFields(input, true);
    const db = requireSupabaseAdmin();

    const { data, error } = await db
      .from('products')
      .insert({ id: `p-${crypto.randomUUID()}`, vendor_id: vendorId, ...fields })
      .select('*')
      .single();

    if (error || !data) {
      throw new DomainError(error?.message || 'Failed to create product.', 500);
    }
    return serializeProduct(data);
  },

  // Applies a partial update to a product the actor owns.
  async update(productId: string, input: Partial<ProductInput>, actor: Actor) {
    const vendorId = assertApprovedVendor(actor);
    const existing = await fetchOwnedProduct(productId, vendorId);

    const updates = validateProductFields(input, false);
    if (Object.keys(updates).length === 0) {
      return serializeProduct(existing);
    }

    const { data, error } = await requireSupabaseAdmin()
      .from('products')
      .update(updates)
      .eq('id', productId)
      .eq('vendor_id', vendorId)
      .select('*')
      .single();

    if (error || !data) {
      throw new DomainError(error?.message || 'Failed to update product.', 500);
    }
    return serializeProduct(data);
  },

  // Deletes a product the actor owns.
  async remove(productId: string, actor: Actor) {
    const vendorId = assertApprovedVendor(actor);
    await fetchOwnedProduct(productId, vendorId);

    const { error } = await requireSupabaseAdmin()
      .from('products')
      .delete()
      .eq('id', productId)
      .eq('vendor_id', vendorId);

    if (error) {
      throw new DomainError(error.message, 500);
    }
    return { deleted: true, id: productId };
  },
};

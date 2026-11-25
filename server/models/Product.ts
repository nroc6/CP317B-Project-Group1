/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { requireSupabaseAdmin } from '../supabaseAdmin.ts';
import { type Actor, DomainError } from './types.ts';

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

function validateProductFields(input: Partial<ProductInput>, isCreate: boolean) {
  const clean: Record<string, unknown> = {};

  if (isCreate || input.name !== undefined) {
    const name = typeof input.name === 'string' ? input.name.trim() : '';
    if (!name || name.length > 120) {
      throw new DomainError('Product name is required (max 120 characters).', 400);
    }
    clean.name = name;
  }

  if (isCreate || input.price !== undefined) {
    const price = Number(input.price);
    if (!Number.isFinite(price) || price <= 0 || price > 10000) {
      throw new DomainError('Product price must be a positive number.', 400);
    }
    clean.price_cents = Math.round(price * 100);
  }

  if (isCreate || input.unit !== undefined) {
    const unit = typeof input.unit === 'string' ? input.unit.trim() : '';
    if (!unit || unit.length > 50) {
      throw new DomainError('Unit is required (max 50 characters).', 400);
    }
    clean.unit = unit;
  }

  if (isCreate || input.category !== undefined) {
    const category = typeof input.category === 'string' ? input.category.trim() : 'Produce';
    clean.category = ALLOWED_CATEGORIES.has(category) ? category : 'Produce';
  }

  if (isCreate || input.description !== undefined) {
    const description = typeof input.description === 'string' ? input.description.trim() : '';
    if (description.length > 1000) {
      throw new DomainError('Description must be under 1000 characters.', 400);
    }
    clean.description = description;
  }

  if (isCreate || input.isAvailable !== undefined) {
    clean.is_available = input.isAvailable !== false;
  }

  if (isCreate || input.imageKey !== undefined) {
    const key = typeof input.imageKey === 'string' ? input.imageKey.trim() : 'produce';
    clean.image_key = ALLOWED_IMAGE_KEYS.has(key) ? key : 'produce';
  }

  return clean;
}

export const ProductModel = {
  async create(input: ProductInput, actor: Actor) {
    const vendorId = assertApprovedVendor(actor);
    const fields = validateProductFields(input, true);
    const db = requireSupabaseAdmin();

    const { data, error } = await db
      .from('products')
      .insert({
        id: `p-${crypto.randomUUID()}`,
        vendor_id: vendorId,
        ...fields,
      })
      .select('*')
      .single();

    if (error || !data) {
      throw new DomainError(error?.message || 'Failed to create product.', 500);
    }
    return serializeProduct(data);
  },

  async update(productId: string, input: Partial<ProductInput>, actor: Actor) {
    const vendorId = assertApprovedVendor(actor);
    const db = requireSupabaseAdmin();

    const { data: existing, error: fetchError } = await db
      .from('products')
      .select('*')
      .eq('id', productId)
      .maybeSingle();

    if (fetchError) {
      throw new DomainError(fetchError.message, 500);
    }
    if (!existing) {
      throw new DomainError('Product not found.', 404);
    }
    if (existing.vendor_id !== vendorId) {
      throw new DomainError('You do not own this product.', 403);
    }

    const updates = validateProductFields(input, false);
    if (Object.keys(updates).length === 0) {
      return serializeProduct(existing);
    }

    const { data, error } = await db
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

  async toggleAvailability(productId: string, isAvailable: boolean, actor: Actor) {
    return ProductModel.update(productId, { isAvailable: Boolean(isAvailable) }, actor);
  },

  async remove(productId: string, actor: Actor) {
    const vendorId = assertApprovedVendor(actor);
    const db = requireSupabaseAdmin();

    const { data: existing, error: fetchError } = await db
      .from('products')
      .select('id, vendor_id')
      .eq('id', productId)
      .maybeSingle();

    if (fetchError) {
      throw new DomainError(fetchError.message, 500);
    }
    if (!existing) {
      throw new DomainError('Product not found.', 404);
    }
    if (existing.vendor_id !== vendorId) {
      throw new DomainError('You do not own this product.', 403);
    }

    const { error } = await db
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

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { requireSupabaseAdmin } from '../supabaseAdmin.ts';
import { type Actor, DomainError } from './types.ts';

export interface CreateReviewInput {
  vendorId: string;
  orderId: string;
  rating: number;
  comment: string;
}

export function serializeReview(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    vendorId: row.vendor_id as string,
    orderId: (row.order_id as string) || null,
    customerId: (row.customer_id as string) || null,
    customerName: row.customer_name as string,
    verifiedOrder: true,
    date: String(row.created_at || '').split('T')[0],
    rating: Number(row.rating),
    comment: row.comment as string,
  };
}

export const ReviewModel = {
  async create(input: CreateReviewInput, actor: Actor) {
    const vendorId = typeof input.vendorId === 'string' ? input.vendorId.trim() : '';
    const orderId = typeof input.orderId === 'string' ? input.orderId.trim() : '';
    const comment = typeof input.comment === 'string' ? input.comment.trim() : '';
    const rating = Number(input.rating);

    if (!vendorId || !orderId) {
      throw new DomainError('A completed order is required to submit a verified review.', 400);
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new DomainError('Rating must be a whole number between 1 and 5.', 400);
    }
    if (!comment || comment.length > 1000) {
      throw new DomainError('Review comment is required (max 1000 characters).', 400);
    }

    const db = requireSupabaseAdmin();

    const { data: order, error: orderErr } = await db
      .from('orders')
      .select('id, customer_id, vendor_id, status')
      .eq('id', orderId)
      .maybeSingle();

    if (orderErr) {
      throw new DomainError(orderErr.message, 500);
    }
    if (!order) {
      throw new DomainError('Order not found.', 404);
    }
    if (order.customer_id !== actor.id) {
      throw new DomainError('You can only review your own completed orders.', 403);
    }
    if (order.vendor_id !== vendorId) {
      throw new DomainError('This order does not belong to the selected vendor.', 400);
    }
    if (order.status !== 'completed') {
      throw new DomainError('Reviews can only be submitted after pickup is completed.', 409);
    }

    const { data: existingReview } = await db
      .from('reviews')
      .select('id')
      .eq('order_id', orderId)
      .maybeSingle();

    if (existingReview) {
      throw new DomainError('A review has already been submitted for this order.', 409);
    }

    const lastInitial = actor.lastName ? ` ${actor.lastName[0]}.` : '';
    const displayName = `${actor.firstName}${lastInitial}`.trim() || 'Verified Customer';

    const { data: inserted, error: insErr } = await db
      .from('reviews')
      .insert({
        id: `rev-${crypto.randomUUID()}`,
        vendor_id: vendorId,
        order_id: orderId,
        customer_id: actor.id,
        customer_name: displayName,
        rating,
        comment,
      })
      .select('*')
      .single();

    if (insErr || !inserted) {
      throw new DomainError(insErr?.message || 'Failed to save review.', 500);
    }

    return serializeReview(inserted as Record<string, unknown>);
  },
};

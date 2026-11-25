/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { requireSupabaseAdmin } from '../supabaseAdmin.ts';
import { type Actor, DomainError } from './types.ts';

export type OrderStatus = 'awaiting_pickup' | 'completed' | 'cancelled' | 'no_show';

export interface CheckoutItemInput {
  productId: string;
  quantity: number;
}

export interface CreateOrderInput {
  items: CheckoutItemInput[];
  pickupWindow: string;
  customerNote?: string;
}

const LEGAL_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  awaiting_pickup: ['completed', 'cancelled', 'no_show'],
  completed: [],
  cancelled: [],
  no_show: [],
};

function formatStatusLabel(status: string): string {
  switch (status) {
    case 'completed':
      return 'Completed (Paid in person)';
    case 'cancelled':
      return 'Cancelled';
    case 'no_show':
      return 'Missed Pickup';
    default:
      return 'Awaiting Pickup (Pay in Person)';
  }
}

export function serializeOrder(row: Record<string, unknown>) {
  const vendor = (row.vendors as Record<string, unknown> | null) || null;
  const market = (row.markets as Record<string, unknown> | null) || null;
  const rawItems = Array.isArray(row.order_items)
    ? (row.order_items as Array<Record<string, unknown>>)
    : [];

  return {
    id: row.id as string,
    date: String(row.created_at || '').split('T')[0],
    createdAt: row.created_at as string,
    customerId: (row.customer_id as string) || null,
    customerEmail: row.customer_email as string,
    customerName: row.customer_name as string,
    vendorId: row.vendor_id as string,
    vendorName: (vendor?.name as string) || (row.vendor_id as string),
    marketId: row.market_id as string,
    marketName: (market?.name as string) || (row.market_id as string),
    pickupWindow: row.pickup_window as string,
    customerNote: (row.customer_note as string) || '',
    total: Number(row.total_cents) / 100,
    totalCents: Number(row.total_cents),
    status: row.status as OrderStatus,
    statusLabel: formatStatusLabel(row.status as string),
    paymentMethod:
      (row.payment_method as string) || 'Pay in person at pickup (Cash, Debit, or e-Transfer)',
    items: rawItems.map((item) => ({
      id: (item.product_id as string) || (item.id as string),
      name: item.name_snapshot as string,
      quantity: Number(item.quantity),
      price: Number(item.price_cents_snapshot) / 100,
      unit: item.unit_snapshot as string,
    })),
  };
}

export const OrderModel = {
  async listForActor(actor: Actor) {
    const db = requireSupabaseAdmin();

    let query = db
      .from('orders')
      .select(
        `
        *,
        vendors ( name ),
        markets ( name ),
        order_items ( id, product_id, name_snapshot, price_cents_snapshot, unit_snapshot, quantity )
      `
      )
      .order('created_at', { ascending: false });

    if (actor.role === 'vendor' && actor.vendorId) {
      query = query.or(`customer_id.eq.${actor.id},vendor_id.eq.${actor.vendorId}`);
    } else {
      query = query.eq('customer_id', actor.id);
    }

    const { data, error } = await query;
    if (error) {
      throw new DomainError(error.message, 500);
    }

    return (data || []).map((row) => serializeOrder(row as Record<string, unknown>));
  },

  async createBatch(input: CreateOrderInput, actor: Actor) {
    if (!Array.isArray(input.items) || input.items.length === 0) {
      throw new DomainError('Your pre-order basket is empty.', 400);
    }

    const pickupWindow =
      typeof input.pickupWindow === 'string' && input.pickupWindow.trim()
        ? input.pickupWindow.trim().slice(0, 120)
        : 'Saturday 9:00 AM – 10:30 AM';

    const customerNote =
      typeof input.customerNote === 'string' ? input.customerNote.trim().slice(0, 500) : '';

    // Normalize and validate requested quantities
    const requestedMap = new Map<string, number>();
    for (const entry of input.items) {
      if (!entry || typeof entry.productId !== 'string' || !entry.productId.trim()) {
        throw new DomainError('Invalid product identifier in basket.', 400);
      }
      const qty = Number(entry.quantity);
      if (!Number.isInteger(qty) || qty < 1 || qty > 100) {
        throw new DomainError('Product quantities must be whole numbers between 1 and 100.', 400);
      }
      requestedMap.set(entry.productId, (requestedMap.get(entry.productId) || 0) + qty);
    }

    const db = requireSupabaseAdmin();
    const productIds = Array.from(requestedMap.keys());

    // Fetch authoritative prices, availability, and vendor/market links from DB
    const { data: productRows, error: prodErr } = await db
      .from('products')
      .select('id, vendor_id, name, price_cents, unit, is_available, vendors ( id, name, market_id, is_approved )')
      .in('id', productIds);

    if (prodErr) {
      throw new DomainError(prodErr.message, 500);
    }

    const byId = new Map<string, Record<string, unknown>>();
    for (const row of productRows || []) {
      byId.set(row.id as string, row as Record<string, unknown>);
    }

    // Group validated items by vendor_id
    const groups = new Map<
      string,
      {
        vendorId: string;
        marketId: string;
        totalCents: number;
        items: Array<{
          product_id: string;
          name_snapshot: string;
          price_cents_snapshot: number;
          unit_snapshot: string;
          quantity: number;
        }>;
      }
    >();

    for (const [productId, quantity] of requestedMap.entries()) {
      const prod = byId.get(productId);
      if (!prod) {
        throw new DomainError(`A product in your basket is no longer available (${productId}).`, 400);
      }
      if (!prod.is_available) {
        throw new DomainError(`"${prod.name}" is currently sold out for this pickup.`, 409);
      }
      const vendor = prod.vendors as Record<string, unknown> | null;
      if (!vendor || !vendor.is_approved) {
        throw new DomainError(`Vendor for "${prod.name}" is not currently accepting orders.`, 400);
      }

      const vendorId = prod.vendor_id as string;
      const marketId = vendor.market_id as string;
      const priceCents = Number(prod.price_cents);

      if (!groups.has(vendorId)) {
        groups.set(vendorId, {
          vendorId,
          marketId,
          totalCents: 0,
          items: [],
        });
      }

      const group = groups.get(vendorId)!;
      group.totalCents += priceCents * quantity;
      group.items.push({
        product_id: productId,
        name_snapshot: prod.name as string,
        price_cents_snapshot: priceCents,
        unit_snapshot: prod.unit as string,
        quantity,
      });
    }

    const customerName = `${actor.firstName} ${actor.lastName}`.trim() || actor.email;
    const createdOrderIds: string[] = [];

    for (const group of groups.values()) {
      const orderId = `ORD-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;

      const { error: orderErr } = await db.from('orders').insert({
        id: orderId,
        customer_id: actor.id,
        customer_email: actor.email,
        customer_name: customerName,
        vendor_id: group.vendorId,
        market_id: group.marketId,
        pickup_window: pickupWindow,
        customer_note: customerNote,
        total_cents: group.totalCents,
        status: 'awaiting_pickup',
        payment_method: 'Pay in person at pickup (Cash, Debit, or e-Transfer)',
      });

      if (orderErr) {
        throw new DomainError(orderErr.message, 500);
      }

      const itemsPayload = group.items.map((item) => ({
        order_id: orderId,
        ...item,
      }));

      const { error: itemsErr } = await db.from('order_items').insert(itemsPayload);
      if (itemsErr) {
        throw new DomainError(itemsErr.message, 500);
      }

      createdOrderIds.push(orderId);
    }

    const { data: hydrated, error: hydrateErr } = await db
      .from('orders')
      .select(
        `
        *,
        vendors ( name ),
        markets ( name ),
        order_items ( id, product_id, name_snapshot, price_cents_snapshot, unit_snapshot, quantity )
      `
      )
      .in('id', createdOrderIds)
      .order('created_at', { ascending: false });

    if (hydrateErr) {
      throw new DomainError(hydrateErr.message, 500);
    }

    return (hydrated || []).map((row) => serializeOrder(row as Record<string, unknown>));
  },

  async transition(orderId: string, targetStatus: OrderStatus, actor: Actor) {
    const db = requireSupabaseAdmin();

    const { data: existing, error: fetchErr } = await db
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle();

    if (fetchErr) {
      throw new DomainError(fetchErr.message, 500);
    }
    if (!existing) {
      throw new DomainError('Order not found.', 404);
    }

    const currentStatus = existing.status as OrderStatus;
    const allowedNext = LEGAL_TRANSITIONS[currentStatus] || [];
    if (!allowedNext.includes(targetStatus)) {
      throw new DomainError(
        `Cannot transition order from "${currentStatus}" to "${targetStatus}".`,
        409
      );
    }

    if (targetStatus === 'completed' || targetStatus === 'no_show') {
      if (actor.role !== 'vendor' || actor.vendorId !== existing.vendor_id) {
        throw new DomainError('Only the fulfilling vendor can update pickup completion.', 403);
      }
    } else if (targetStatus === 'cancelled') {
      if (existing.customer_id !== actor.id) {
        throw new DomainError('Only the customer who placed this pre-order can cancel it.', 403);
      }
    }

    const { data: updated, error: updErr } = await db
      .from('orders')
      .update({ status: targetStatus })
      .eq('id', orderId)
      .eq('status', currentStatus)
      .select(
        `
        *,
        vendors ( name ),
        markets ( name ),
        order_items ( id, product_id, name_snapshot, price_cents_snapshot, unit_snapshot, quantity )
      `
      )
      .single();

    if (updErr || !updated) {
      throw new DomainError(updErr?.message || 'Failed to update order status.', 500);
    }

    return serializeOrder(updated as Record<string, unknown>);
  },
};

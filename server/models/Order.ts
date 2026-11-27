/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { requireSupabaseAdmin } from '../supabaseAdmin.ts';
import { type Actor, DomainError, cleanString, toDateOnly } from './types.ts';

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

interface OrderItemSnapshot {
  product_id: string;
  name_snapshot: string;
  price_cents_snapshot: number;
  unit_snapshot: string;
  quantity: number;
}

interface VendorOrderGroup {
  vendorId: string;
  marketId: string;
  totalCents: number;
  items: OrderItemSnapshot[];
}

const DEFAULT_PICKUP_WINDOW = 'Saturday 9:00 AM – 10:30 AM';
const PAYMENT_METHOD = 'Pay in person at pickup (Cash, Debit, or e-Transfer)';

// Columns + joins needed to serialize a full order for the client.
const ORDER_SELECT = `
  *,
  vendors ( name ),
  markets ( name ),
  order_items ( id, product_id, name_snapshot, price_cents_snapshot, unit_snapshot, quantity )
`;

// Order status machine: everything starts awaiting pickup, and all other states are terminal.
const LEGAL_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  awaiting_pickup: ['completed', 'cancelled', 'no_show'],
  completed: [],
  cancelled: [],
  no_show: [],
};

// Human-readable label shown next to each status in the UI.
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

// Converts an orders row (with joins from ORDER_SELECT) into the client shape.
export function serializeOrder(row: Record<string, unknown>) {
  const vendor = (row.vendors as Record<string, unknown> | null) || null;
  const market = (row.markets as Record<string, unknown> | null) || null;
  const rawItems = Array.isArray(row.order_items)
    ? (row.order_items as Array<Record<string, unknown>>)
    : [];

  return {
    id: row.id as string,
    date: toDateOnly(row.created_at),
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
    paymentMethod: (row.payment_method as string) || PAYMENT_METHOD,
    items: rawItems.map((item) => ({
      id: (item.product_id as string) || (item.id as string),
      name: item.name_snapshot as string,
      quantity: Number(item.quantity),
      price: Number(item.price_cents_snapshot) / 100,
      unit: item.unit_snapshot as string,
    })),
  };
}

// Validates basket entries and merges duplicate products into one quantity each.
function normalizeBasket(items: CheckoutItemInput[]): Map<string, number> {
  const requested = new Map<string, number>();
  for (const entry of items) {
    if (!entry || typeof entry.productId !== 'string' || !entry.productId.trim()) {
      throw new DomainError('Invalid product identifier in basket.', 400);
    }
    const qty = Number(entry.quantity);
    if (!Number.isInteger(qty) || qty < 1 || qty > 100) {
      throw new DomainError('Product quantities must be whole numbers between 1 and 100.', 400);
    }
    requested.set(entry.productId, (requested.get(entry.productId) || 0) + qty);
  }
  return requested;
}

export const OrderModel = {
  // Lists orders the actor placed, plus (for vendors) orders placed at their stall.
  async listForActor(actor: Actor) {
    const db = requireSupabaseAdmin();

    let query = db.from('orders').select(ORDER_SELECT).order('created_at', { ascending: false });

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

  // Checks out a cart: re-reads live prices and splits it into one order per vendor.
  async createBatch(input: CreateOrderInput, actor: Actor) {
    if (!Array.isArray(input.items) || input.items.length === 0) {
      throw new DomainError('Your pre-order basket is empty.', 400);
    }

    const pickupWindow = cleanString(input.pickupWindow).slice(0, 120) || DEFAULT_PICKUP_WINDOW;
    const customerNote = cleanString(input.customerNote).slice(0, 500);
    const requested = normalizeBasket(input.items);

    const db = requireSupabaseAdmin();

    // Fetch authoritative prices, availability, and vendor/market links (never trust client prices).
    const { data: productRows, error: prodErr } = await db
      .from('products')
      .select('id, vendor_id, name, price_cents, unit, is_available, vendors ( id, name, market_id, is_approved )')
      .in('id', Array.from(requested.keys()));

    if (prodErr) {
      throw new DomainError(prodErr.message, 500);
    }

    const productsById = new Map<string, Record<string, unknown>>();
    for (const row of productRows || []) {
      productsById.set(row.id as string, row as Record<string, unknown>);
    }

    // Validate each product and group the line items by vendor.
    const groups = new Map<string, VendorOrderGroup>();

    for (const [productId, quantity] of requested.entries()) {
      const prod = productsById.get(productId);
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
      const priceCents = Number(prod.price_cents);

      let group = groups.get(vendorId);
      if (!group) {
        group = { vendorId, marketId: vendor.market_id as string, totalCents: 0, items: [] };
        groups.set(vendorId, group);
      }

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

    // Insert one order row (plus its item snapshots) per vendor.
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
        payment_method: PAYMENT_METHOD,
      });

      if (orderErr) {
        throw new DomainError(orderErr.message, 500);
      }

      const itemsPayload = group.items.map((item) => ({ order_id: orderId, ...item }));
      const { error: itemsErr } = await db.from('order_items').insert(itemsPayload);
      if (itemsErr) {
        throw new DomainError(itemsErr.message, 500);
      }

      createdOrderIds.push(orderId);
    }

    // Re-read the new orders with joins so the response matches listForActor.
    const { data: hydrated, error: hydrateErr } = await db
      .from('orders')
      .select(ORDER_SELECT)
      .in('id', createdOrderIds)
      .order('created_at', { ascending: false });

    if (hydrateErr) {
      throw new DomainError(hydrateErr.message, 500);
    }

    return (hydrated || []).map((row) => serializeOrder(row as Record<string, unknown>));
  },

  // Moves an order to a new status, enforcing the status machine and who may make each change.
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

    // Vendors mark pickup outcomes; only the customer can cancel.
    if (targetStatus === 'completed' || targetStatus === 'no_show') {
      if (actor.role !== 'vendor' || actor.vendorId !== existing.vendor_id) {
        throw new DomainError('Only the fulfilling vendor can update pickup completion.', 403);
      }
    } else if (targetStatus === 'cancelled') {
      if (existing.customer_id !== actor.id) {
        throw new DomainError('Only the customer who placed this pre-order can cancel it.', 403);
      }
    }

    // Matching on the current status guards against a concurrent transition.
    const { data: updated, error: updErr } = await db
      .from('orders')
      .update({ status: targetStatus })
      .eq('id', orderId)
      .eq('status', currentStatus)
      .select(ORDER_SELECT)
      .single();

    if (updErr || !updated) {
      throw new DomainError(updErr?.message || 'Failed to update order status.', 500);
    }

    return serializeOrder(updated as Record<string, unknown>);
  },
};

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { requireSupabaseAdmin } from '../supabaseAdmin.ts';
import { type Actor, DomainError, toDateOnly } from './types.ts';

type VendorFields = Pick<Actor, 'vendorId' | 'vendorName' | 'marketId' | 'marketName' | 'isApproved'>;

// Supabase may return a joined row as an object or a one-element array.
function firstJoined<T>(value: unknown): T | null {
  return ((Array.isArray(value) ? value[0] : value) as T | undefined) ?? null;
}

export const UserModel = {
  // Verifies a Supabase access token and builds the Actor (profile + vendor link) for it.
  async resolveActorFromToken(accessToken: string): Promise<Actor> {
    const db = requireSupabaseAdmin();
    const {
      data: { user },
      error: authErr,
    } = await db.auth.getUser(accessToken);

    if (authErr || !user) {
      throw new DomainError('Unauthorized: invalid or expired session.', 401);
    }

    const { data: profile, error: profErr } = await db
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (profErr) {
      throw new DomainError(profErr.message, 500);
    }

    const meta = user.user_metadata || {};
    const role: Actor['role'] =
      profile?.role === 'vendor' || meta.role === 'vendor' ? 'vendor' : 'customer';
    const firstName = (profile?.first_name as string) || (meta.first_name as string) || 'Market';
    const lastName = (profile?.last_name as string) || (meta.last_name as string) || 'Member';

    // Self-heal: create the profile if the signup trigger hasn't run yet.
    if (!profile) {
      await db.from('profiles').upsert({
        id: user.id,
        email: user.email || '',
        first_name: firstName,
        last_name: lastName,
        role,
      });
    }

    // Vendors carry their stall/market link; a vendor without a stall is treated as unapproved.
    let vendorFields: VendorFields = {
      vendorId: null,
      vendorName: null,
      marketId: null,
      marketName: null,
      isApproved: role !== 'vendor',
    };

    if (role === 'vendor') {
      const { data: vendor } = await db
        .from('vendors')
        .select('id, name, market_id, is_approved, markets ( name )')
        .eq('owner_user_id', user.id)
        .maybeSingle();

      if (vendor) {
        vendorFields = {
          vendorId: vendor.id as string,
          vendorName: vendor.name as string,
          marketId: vendor.market_id as string,
          marketName: firstJoined<{ name?: string }>(vendor.markets)?.name || null,
          isApproved: Boolean(vendor.is_approved),
        };
      }
    }

    return {
      id: user.id,
      email: user.email || (profile?.email as string) || '',
      firstName,
      lastName,
      role,
      city: (profile?.city as string) || null,
      ...vendorFields,
      createdAt: toDateOnly(profile?.created_at || user.created_at),
    };
  },

  // Permanently deletes the actor's auth user (dependent rows cascade in the DB).
  async deleteAccount(actor: Actor) {
    const db = requireSupabaseAdmin();
    const { error } = await db.auth.admin.deleteUser(actor.id);
    if (error) {
      throw new DomainError(error.message, 500);
    }
    return { deleted: true };
  },
};

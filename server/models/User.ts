/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { requireSupabaseAdmin } from '../supabaseAdmin.ts';
import { type Actor, DomainError } from './types.ts';

export const UserModel = {
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

    // Self-heal profile if trigger wasn't executed yet
    const role: 'customer' | 'vendor' =
      profile?.role === 'vendor' || user.user_metadata?.role === 'vendor'
        ? 'vendor'
        : 'customer';

    const firstName =
      (profile?.first_name as string) ||
      (user.user_metadata?.first_name as string) ||
      'Market';
    const lastName =
      (profile?.last_name as string) ||
      (user.user_metadata?.last_name as string) ||
      'Member';

    if (!profile) {
      await db.from('profiles').upsert({
        id: user.id,
        email: user.email || '',
        first_name: firstName,
        last_name: lastName,
        role,
      });
    }

    let vendorId: string | null = null;
    let vendorName: string | null = null;
    let marketId: string | null = null;
    let marketName: string | null = null;
    let isApproved = true;

    if (role === 'vendor') {
      const { data: vendor } = await db
        .from('vendors')
        .select('id, name, market_id, is_approved, markets ( name )')
        .eq('owner_user_id', user.id)
        .maybeSingle();

      if (vendor) {
        const joinedMarket = Array.isArray(vendor.markets)
          ? (vendor.markets[0] as { name?: string } | undefined)
          : (vendor.markets as { name?: string } | null);
        vendorId = vendor.id as string;
        vendorName = vendor.name as string;
        marketId = vendor.market_id as string;
        marketName = joinedMarket?.name || null;
        isApproved = Boolean(vendor.is_approved);
      } else {
        isApproved = false;
      }
    }

    return {
      id: user.id,
      email: user.email || (profile?.email as string) || '',
      firstName,
      lastName,
      role,
      city: (profile?.city as string) || null,
      vendorId,
      vendorName,
      marketId,
      marketName,
      isApproved,
      createdAt: String(profile?.created_at || user.created_at || '').split('T')[0],
    };
  },

  async deleteAccount(actor: Actor) {
    const db = requireSupabaseAdmin();
    const { error } = await db.auth.admin.deleteUser(actor.id);
    if (error) {
      throw new DomainError(error.message, 500);
    }
    return { deleted: true };
  },
};

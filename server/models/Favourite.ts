/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { requireSupabaseAdmin } from '../supabaseAdmin.ts';
import { type Actor, DomainError } from './types.ts';

export const FavouriteModel = {
  async list(actor: Actor): Promise<string[]> {
    const db = requireSupabaseAdmin();
    const { data, error } = await db
      .from('favourites')
      .select('target_id')
      .eq('user_id', actor.id);

    if (error) {
      throw new DomainError(error.message, 500);
    }
    return (data || []).map((row) => row.target_id as string);
  },

  async toggle(targetType: 'market' | 'vendor', targetId: string, actor: Actor) {
    if (targetType !== 'market' && targetType !== 'vendor') {
      throw new DomainError('Favourite targetType must be "market" or "vendor".', 400);
    }
    const cleanId = typeof targetId === 'string' ? targetId.trim() : '';
    if (!cleanId) {
      throw new DomainError('Target ID is required.', 400);
    }

    const db = requireSupabaseAdmin();
    const { data: existing, error: fetchErr } = await db
      .from('favourites')
      .select('target_id')
      .eq('user_id', actor.id)
      .eq('target_type', targetType)
      .eq('target_id', cleanId)
      .maybeSingle();

    if (fetchErr) {
      throw new DomainError(fetchErr.message, 500);
    }

    if (existing) {
      const { error: delErr } = await db
        .from('favourites')
        .delete()
        .eq('user_id', actor.id)
        .eq('target_type', targetType)
        .eq('target_id', cleanId);

      if (delErr) {
        throw new DomainError(delErr.message, 500);
      }
      return { saved: false, targetId: cleanId };
    }

    // Verify target exists
    const table = targetType === 'market' ? 'markets' : 'vendors';
    const { data: targetRow } = await db
      .from(table)
      .select('id')
      .eq('id', cleanId)
      .maybeSingle();

    if (!targetRow) {
      throw new DomainError(`Target ${targetType} not found.`, 404);
    }

    const { error: insErr } = await db.from('favourites').insert({
      user_id: actor.id,
      target_type: targetType,
      target_id: cleanId,
    });

    if (insErr) {
      throw new DomainError(insErr.message, 500);
    }
    return { saved: true, targetId: cleanId };
  },
};

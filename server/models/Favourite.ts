/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { requireSupabaseAdmin } from '../supabaseAdmin.ts';
import { type Actor, DomainError, cleanString } from './types.ts';

type FavouriteTarget = 'market' | 'vendor';

export const FavouriteModel = {
  // Returns the IDs of every market/vendor the actor has saved.
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

  // Saves the target if it isn't saved yet, otherwise removes it.
  async toggle(targetType: FavouriteTarget, targetId: string, actor: Actor) {
    if (targetType !== 'market' && targetType !== 'vendor') {
      throw new DomainError('Favourite targetType must be "market" or "vendor".', 400);
    }
    const cleanId = cleanString(targetId);
    if (!cleanId) {
      throw new DomainError('Target ID is required.', 400);
    }

    const db = requireSupabaseAdmin();
    const row = { user_id: actor.id, target_type: targetType, target_id: cleanId };

    const { data: existing, error: fetchErr } = await db
      .from('favourites')
      .select('target_id')
      .match(row)
      .maybeSingle();

    if (fetchErr) {
      throw new DomainError(fetchErr.message, 500);
    }

    // Already saved: un-save it.
    if (existing) {
      const { error: delErr } = await db.from('favourites').delete().match(row);
      if (delErr) {
        throw new DomainError(delErr.message, 500);
      }
      return { saved: false, targetId: cleanId };
    }

    // Make sure the market/vendor actually exists before saving it.
    const table = targetType === 'market' ? 'markets' : 'vendors';
    const { data: targetRow } = await db.from(table).select('id').eq('id', cleanId).maybeSingle();
    if (!targetRow) {
      throw new DomainError(`Target ${targetType} not found.`, 404);
    }

    const { error: insErr } = await db.from('favourites').insert(row);
    if (insErr) {
      throw new DomainError(insErr.message, 500);
    }
    return { saved: true, targetId: cleanId };
  },
};

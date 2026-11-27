/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const isServerSupabaseConfigured = Boolean(supabaseUrl && supabaseServiceKey);

// Service-role client: bypasses RLS, so models must enforce authorization themselves.
export const supabaseAdmin: SupabaseClient | null = isServerSupabaseConfigured
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;

// Returns the admin client, or throws a 503 when server credentials are missing.
export function requireSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdmin) {
    const err = new Error(
      'Supabase server credentials are missing. Configure VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY.'
    );
    (err as Error & { statusCode?: number }).statusCode = 503;
    throw err;
  }
  return supabaseAdmin;
}

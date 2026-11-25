/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

export const isServerSupabaseConfigured = Boolean(supabaseUrl && supabaseServiceKey);

export const supabaseAdmin: SupabaseClient | null = isServerSupabaseConfigured
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

export const supabasePublicAuthClient: SupabaseClient | null =
  supabaseUrl && (supabaseAnonKey || supabaseServiceKey)
    ? createClient(supabaseUrl, supabaseAnonKey || supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null;

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

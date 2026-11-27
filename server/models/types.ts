/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// The authenticated user making a request, resolved server-side from their access token.
export interface Actor {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'customer' | 'vendor';
  city?: string | null;
  vendorId?: string | null;
  vendorName?: string | null;
  marketId?: string | null;
  marketName?: string | null;
  isApproved: boolean;
  createdAt?: string;
}

// Expected business-rule error; the API error handler returns it as { error } with statusCode.
export class DomainError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'DomainError';
    this.statusCode = statusCode;
  }
}

// Trims a client-supplied value, falling back when it isn't a string.
export function cleanString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback;
}

// Converts an ISO timestamp to its YYYY-MM-DD date part.
export function toDateOnly(value: unknown): string {
  return String(value || '').split('T')[0];
}

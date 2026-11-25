/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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

export class DomainError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'DomainError';
    this.statusCode = statusCode;
  }
}

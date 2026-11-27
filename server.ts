/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import path from 'node:path';
import express, { type Request, type Response, type NextFunction } from 'express';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { isServerSupabaseConfigured, requireSupabaseAdmin } from './server/supabaseAdmin.ts';
import { type Actor, DomainError } from './server/models/types.ts';
import { UserModel } from './server/models/User.ts';
import { ProductModel } from './server/models/Product.ts';
import { OrderModel, type OrderStatus } from './server/models/Order.ts';
import { ReviewModel } from './server/models/Review.ts';
import { FavouriteModel } from './server/models/Favourite.ts';

dotenv.config();

interface AuthedRequest extends Request {
  actor?: Actor;
}

type Handler = (req: AuthedRequest, res: Response, next: NextFunction) => Promise<void>;

// Wraps an async route so rejected promises reach the Express error handler.
function asyncHandler(fn: Handler) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Middleware: reads the Bearer token and attaches the resolved Actor to req.actor (401 otherwise).
async function requireActor(req: AuthedRequest, _res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      throw new DomainError('Missing Authorization Bearer token.', 401);
    }
    const token = authHeader.slice(7).trim();
    if (!token) {
      throw new DomainError('Empty Authorization Bearer token.', 401);
    }
    req.actor = await UserModel.resolveActorFromToken(token);
    next();
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// Demo accounts
// ---------------------------------------------------------------------------

const DEMO_CUSTOMER = {
  email: 'customer@basket.ca',
  first_name: 'Claire',
  last_name: 'Dubois',
  role: 'customer',
  city: 'Kitchener',
} as const;

const DEMO_VENDOR = {
  email: 'vendor@basket.ca',
  first_name: 'Eli & Sarah',
  last_name: 'Martin',
  role: 'vendor',
  city: 'Woolwich',
} as const;

type DemoProfile = typeof DEMO_CUSTOMER | typeof DEMO_VENDOR;

// Returns the existing auth user for a demo profile, creating it if needed.
async function findOrCreateDemoUser(
  existingUsers: Array<{ id: string; email?: string }>,
  profile: DemoProfile,
  password: string
) {
  const found = existingUsers.find((u) => u.email?.toLowerCase() === profile.email);
  if (found) return found;

  const db = requireSupabaseAdmin();
  const { data, error } = await db.auth.admin.createUser({
    email: profile.email,
    password,
    email_confirm: true,
    user_metadata: {
      first_name: profile.first_name,
      last_name: profile.last_name,
      role: profile.role,
      // Stops the signup trigger from creating a new stall; the demo vendor is linked to seed data below.
      ...(profile.role === 'vendor' ? { skip_auto_vendor: 'true' } : {}),
    },
  });
  if (error || !data.user) {
    throw new DomainError(error?.message || `Failed to seed demo ${profile.role}.`, 500);
  }
  return data.user;
}

// Ensures both demo accounts exist and are linked to the seeded vendor, orders, reviews and favourites.
async function ensureDemoAccounts() {
  const db = requireSupabaseAdmin();
  const demoPassword = process.env.DEMO_ACCOUNT_PASSWORD || 'demo1234';

  const { data: listData, error: listErr } = await db.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (listErr) {
    throw new DomainError(listErr.message, 500);
  }
  const users = listData?.users || [];

  const customerUser = await findOrCreateDemoUser(users, DEMO_CUSTOMER, demoPassword);
  const vendorUser = await findOrCreateDemoUser(users, DEMO_VENDOR, demoPassword);

  await db.from('profiles').upsert({ id: customerUser.id, ...DEMO_CUSTOMER });
  await db.from('profiles').upsert({ id: vendorUser.id, ...DEMO_VENDOR });

  // Link the demo vendor to Harvest Table Organics and claim the seeded orders/reviews for the demo customer.
  await db
    .from('vendors')
    .update({ owner_user_id: vendorUser.id, is_approved: true })
    .eq('id', 'v-harvest-table');

  await db
    .from('orders')
    .update({ customer_id: customerUser.id })
    .eq('customer_email', DEMO_CUSTOMER.email)
    .is('customer_id', null);

  await db
    .from('reviews')
    .update({ customer_id: customerUser.id })
    .in('id', ['r-1', 'r-3'])
    .is('customer_id', null);

  // Give the demo customer default favourites if they have none.
  const { data: existingFavs } = await db
    .from('favourites')
    .select('target_id')
    .eq('user_id', customerUser.id);

  if (!existingFavs || existingFavs.length === 0) {
    await db.from('favourites').upsert([
      { user_id: customerUser.id, target_type: 'market', target_id: 'st-jacobs' },
      { user_id: customerUser.id, target_type: 'vendor', target_id: 'v-harvest-table' },
    ]);
  }
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '100kb' }));

  // Health check: reports whether server-side Supabase credentials are present.
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, supabaseConfigured: isServerSupabaseConfigured });
  });

  // Demo account bootstrap, called by the demo buttons on /login.
  app.post(
    '/api/demo/ensure-accounts',
    asyncHandler(async (_req, res) => {
      if (process.env.ENABLE_DEMO_ACCOUNTS === 'false') {
        throw new DomainError('Demo accounts are disabled in this environment.', 403);
      }
      await ensureDemoAccounts();
      res.json({ ok: true });
    })
  );

  // --- Account ---
  app.get(
    '/api/me',
    requireActor,
    asyncHandler(async (req, res) => {
      res.json({ user: req.actor });
    })
  );

  app.delete(
    '/api/account',
    requireActor,
    asyncHandler(async (req, res) => {
      res.json(await UserModel.deleteAccount(req.actor!));
    })
  );

  // --- Products (approved vendor owners only) ---
  app.post(
    '/api/products',
    requireActor,
    asyncHandler(async (req, res) => {
      const product = await ProductModel.create(req.body || {}, req.actor!);
      res.status(201).json({ product });
    })
  );

  app.patch(
    '/api/products/:id',
    requireActor,
    asyncHandler(async (req, res) => {
      const product = await ProductModel.update(req.params.id, req.body || {}, req.actor!);
      res.json({ product });
    })
  );

  app.delete(
    '/api/products/:id',
    requireActor,
    asyncHandler(async (req, res) => {
      res.json(await ProductModel.remove(req.params.id, req.actor!));
    })
  );

  // --- Orders: listing, checkout, and status transitions ---
  app.get(
    '/api/orders',
    requireActor,
    asyncHandler(async (req, res) => {
      res.json({ orders: await OrderModel.listForActor(req.actor!) });
    })
  );

  app.post(
    '/api/orders',
    requireActor,
    asyncHandler(async (req, res) => {
      const orders = await OrderModel.createBatch(req.body || {}, req.actor!);
      res.status(201).json({ orders });
    })
  );

  app.patch(
    '/api/orders/:id/status',
    requireActor,
    asyncHandler(async (req, res) => {
      const status = req.body?.status as OrderStatus;
      const order = await OrderModel.transition(req.params.id, status, req.actor!);
      res.json({ order });
    })
  );

  // --- Reviews (verified completed orders only) ---
  app.post(
    '/api/reviews',
    requireActor,
    asyncHandler(async (req, res) => {
      const review = await ReviewModel.create(req.body || {}, req.actor!);
      res.status(201).json({ review });
    })
  );

  // --- Favourites ---
  app.get(
    '/api/favourites',
    requireActor,
    asyncHandler(async (req, res) => {
      res.json({ favourites: await FavouriteModel.list(req.actor!) });
    })
  );

  app.post(
    '/api/favourites/toggle',
    requireActor,
    asyncHandler(async (req, res) => {
      const { targetType, targetId } = req.body || {};
      res.json(await FavouriteModel.toggle(targetType, targetId, req.actor!));
    })
  );

  // API error handler: turns thrown errors into { error } JSON with their statusCode (default 500).
  app.use('/api', (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const code = Number((err as { statusCode?: number })?.statusCode);
    const statusCode = code >= 400 ? code : 500;
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(statusCode).json({ error: message });
  });

  // Serve the built SPA in production, or mount Vite middleware in development.
  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(import.meta.dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const port = Number(process.env.PORT || 3000);
  app.listen(port, '0.0.0.0', () => {
    console.log(`Basket server listening on http://localhost:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Basket server:', err);
  process.exit(1);
});

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

function asyncHandler(
  fn: (req: AuthedRequest, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

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

// Ensures the two documented demo accounts exist in Supabase Auth when demo login is clicked
async function ensureDemoAccounts() {
  const db = requireSupabaseAdmin();
  const demoPassword = process.env.DEMO_ACCOUNT_PASSWORD || 'demo1234';

  const { data: listData, error: listErr } = await db.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (listErr) {
    throw new DomainError(listErr.message, 500);
  }

  const users = listData?.users || [];
  let customerUser = users.find((u) => u.email?.toLowerCase() === 'customer@basket.ca');
  let vendorUser = users.find((u) => u.email?.toLowerCase() === 'vendor@basket.ca');

  if (!customerUser) {
    const { data, error } = await db.auth.admin.createUser({
      email: 'customer@basket.ca',
      password: demoPassword,
      email_confirm: true,
      user_metadata: {
        first_name: 'Claire',
        last_name: 'Dubois',
        role: 'customer',
      },
    });
    if (error || !data.user) {
      throw new DomainError(error?.message || 'Failed to seed demo customer.', 500);
    }
    customerUser = data.user;
  }

  if (!vendorUser) {
    const { data, error } = await db.auth.admin.createUser({
      email: 'vendor@basket.ca',
      password: demoPassword,
      email_confirm: true,
      user_metadata: {
        first_name: 'Eli & Sarah',
        last_name: 'Martin',
        role: 'vendor',
        skip_auto_vendor: 'true',
      },
    });
    if (error || !data.user) {
      throw new DomainError(error?.message || 'Failed to seed demo vendor.', 500);
    }
    vendorUser = data.user;
  }

  // Link demo vendor user to Harvest Table Organics and demo customer to seeded sample orders
  await db
    .from('profiles')
    .upsert({
      id: customerUser.id,
      email: 'customer@basket.ca',
      first_name: 'Claire',
      last_name: 'Dubois',
      role: 'customer',
      city: 'Kitchener',
    });

  await db
    .from('profiles')
    .upsert({
      id: vendorUser.id,
      email: 'vendor@basket.ca',
      first_name: 'Eli & Sarah',
      last_name: 'Martin',
      role: 'vendor',
      city: 'Woolwich',
    });

  await db
    .from('vendors')
    .update({ owner_user_id: vendorUser.id, is_approved: true })
    .eq('id', 'v-harvest-table');

  await db
    .from('orders')
    .update({ customer_id: customerUser.id })
    .eq('customer_email', 'customer@basket.ca')
    .is('customer_id', null);

  await db
    .from('reviews')
    .update({ customer_id: customerUser.id })
    .in('id', ['r-1', 'r-3'])
    .is('customer_id', null);

  // Seed default favourites for demo customer if empty
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

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '100kb' }));

  // Health & config status endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      supabaseConfigured: isServerSupabaseConfigured,
    });
  });

  // Demo account bootstrap (only active when explicitly requested from /login demo buttons)
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

  // Current authenticated actor profile
  app.get(
    '/api/me',
    requireActor,
    asyncHandler(async (req, res) => {
      res.json({ user: req.actor });
    })
  );

  // Account deletion (uses Supabase Admin API safely on server)
  app.delete(
    '/api/account',
    requireActor,
    asyncHandler(async (req, res) => {
      const result = await UserModel.deleteAccount(req.actor!);
      res.json(result);
    })
  );

  // Product mutations (approved vendor owners only)
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
      const result = await ProductModel.remove(req.params.id, req.actor!);
      res.json(result);
    })
  );

  // Orders: read & authoritative checkout / lifecycle transitions
  app.get(
    '/api/orders',
    requireActor,
    asyncHandler(async (req, res) => {
      const orders = await OrderModel.listForActor(req.actor!);
      res.json({ orders });
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

  // Verified completed-order reviews
  app.post(
    '/api/reviews',
    requireActor,
    asyncHandler(async (req, res) => {
      const review = await ReviewModel.create(req.body || {}, req.actor!);
      res.status(201).json({ review });
    })
  );

  // User favourites
  app.get(
    '/api/favourites',
    requireActor,
    asyncHandler(async (req, res) => {
      const favourites = await FavouriteModel.list(req.actor!);
      res.json({ favourites });
    })
  );

  app.post(
    '/api/favourites/toggle',
    requireActor,
    asyncHandler(async (req, res) => {
      const result = await FavouriteModel.toggle(
        req.body?.targetType,
        req.body?.targetId,
        req.actor!
      );
      res.json(result);
    })
  );

  // API error handler
  app.use('/api', (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const statusCode =
      (err as { statusCode?: number })?.statusCode &&
      Number((err as { statusCode?: number }).statusCode) >= 400
        ? Number((err as { statusCode?: number }).statusCode)
        : 500;
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(statusCode).json({ error: message });
  });

  // Mount Vite middleware in development, or serve built dist/ in production
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

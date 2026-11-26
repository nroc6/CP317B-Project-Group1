# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Basket — pre-order platform for Ontario farmers' markets (pickup only, no online payment). React 19 SPA + thin Express API, backed by Supabase (Postgres + Auth + RLS).

`docs/SPECIFICATION.MD` is the as-built ground truth (entities, fields, endpoints); `docs/ROADMAP.md` holds architecture invariants and the remaining backlog. README.md is partly stale — it still describes localStorage persistence; trust the docs/ files and code over it.

## Commands

- `npm install`
- `npm run dev` — runs `tsx server.ts`: Express on port 3000 (`PORT` overrides) with Vite mounted as middleware. Do not run `vite` directly; `/api/*` would be missing.
- `npm run build` — Vite build to `dist/`.
- `npm start` — production mode, Express serves `dist/`. The script uses `NODE_ENV=production ...` POSIX syntax, which fails in PowerShell/cmd; on Windows set the env var separately.
- `npm run lint` — `tsc --noEmit` (type check only; no ESLint).
- No test framework is configured.

## Environment

`.env` (gitignored) needs `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (client + server) and `SUPABASE_SERVICE_ROLE_KEY` (server only). Optional: `ENABLE_DEMO_ACCOUNTS=false` disables `/api/demo/ensure-accounts`; `DEMO_ACCOUNT_PASSWORD` (default `demo1234`); `DISABLE_HMR=true` (AI Studio). Without server credentials, API routes return 503 via `requireSupabaseAdmin()`. `.env.example` is an AI Studio leftover and does not list the Supabase vars.

The `supabase/` directory (`schema.sql`, `seed.sql`, RLS policies, triggers) is gitignored, so it may not exist in a fresh clone even though the docs reference it.

## Architecture

**Trust boundary** — the browser is untrusted:
- Public catalog reads (markets, approved vendors, products, reviews) go directly from the client to Supabase using the anon key, protected by RLS (`src/data.js`, `src/lib/supabase.js`).
- Auth (sign in/up/out, session) uses Supabase Auth directly from `src/context/AuthContext.jsx`.
- All mutations and private reads (orders, favourites, `/api/me`, account deletion, product CRUD, reviews) go through Express via `apiRequest()` in `src/lib/supabase.js`, which attaches `Authorization: Bearer <supabase access token>`.
- `server.ts` → `requireActor` middleware → `UserModel.resolveActorFromToken` builds an `Actor` (role, vendorId, isApproved, …) → model method. The server writes with the service-role key (`server/supabaseAdmin.ts`), bypassing RLS, so authorization must be enforced in the model.

**Model method contract** (`server/models/*.ts`):
- Every write takes `actor` as its final parameter and checks role/ownership inside the method (e.g. `assertApprovedVendor` in Product.ts).
- IDs, timestamps, prices (`price_cents`, `price_cents_snapshot`), `total_cents` and initial status are server-derived; ignore client-supplied values.
- Throw `DomainError(message, statusCode)` from `server/models/types.ts`; the `/api` error handler turns it into `{ error }` with that status.
- Money is stored as integer cents; `serialize*` / `map*Row` helpers convert snake_case DB rows to camelCase objects with dollar `price`.

**Order rules:**
- `OrderModel.createBatch` re-reads live prices and availability and splits a multi-vendor cart into one `orders` row per vendor, with `order_items` snapshots.
- Status machine in `OrderModel.transition`: `awaiting_pickup` → `completed` / `no_show` (owning vendor only) or `cancelled` (owning customer only). All three are terminal.
- `ReviewModel.create` requires a completed order owned by the actor for that vendor; one review per order.

**Client:**
- Pages and components are plain `.jsx`; only entry files (`App.tsx`, `main.tsx`) and the server are TS.
- `AuthContext` holds session, actor, orders, favourites and the cart. The unsubmitted cart is the only remaining localStorage state (`basket_cart_items`).
- Images are referenced by key (`produce`, `bakery`, `preserves`, `hero`) and resolved via `resolveAssetImage` in `src/data.js`. The server's `ALLOWED_IMAGE_KEYS` / `ALLOWED_CATEGORIES` in Product.ts must stay in sync with the UI options.
- Styling uses Tailwind v4 (`@tailwindcss/vite`) with the brand palette: deep green `#2F5D3A`, cream `#FAF6EE`, terracotta `#C96F4A`, charcoal `#232323`. Fonts are Fraunces (headings) and Plus Jakarta Sans (UI).

**Demo accounts:** `customer@basket.ca` / `vendor@basket.ca` (password `demo1234`). The Login page's demo buttons call `POST /api/demo/ensure-accounts`, which creates the users and links them to seed data (`v-harvest-table` vendor, seeded orders, reviews and favourites).

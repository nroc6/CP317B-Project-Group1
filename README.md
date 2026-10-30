# Basket | Ontario Farmers' Market Pre-Order Platform

Basket is a modern, responsive pre-order platform built specifically for Ontario farmers' markets. Customers reserve fresh local produce, artisanal sourdough, raw honey, and farmhouse cheeses in advance for weekend market pickup.

**Pickup Only**: Zero credit card information is collected online. Customers inspect their orders and pay vendors directly in person at the stall via Cash, Debit, or Interac e-Transfer.

---

## 🌾 Key Features

1. **Ontario Market Directory & Dual Map**:
   - Interactive OpenStreetMap (Leaflet) view with deep-green pins across Southern & Eastern Ontario, plus a stylized regional SVG map fallback.
   - City search with dropdown filter and privacy-preserving browser geolocation.
   - 8 realistic Ontario markets: St. Jacobs, ByWard (Ottawa), Kensington (Toronto), Hamilton, Guelph, Kitchener, Covent Garden (London), and Peterborough.

2. **Market Pages (`/markets/:id`)**:
   - Day-by-day operating hours tables, season status, and official market announcement cards (text + photo).
   - Vendor directory cards linking directly to stall catalogues.

3. **Vendor Stall Pages (`/vendors/:id`)**:
   - Weekly inventory with "Available this week" status badges, price/unit notation, and quantity steppers.
   - Verified customer reviews (1–5 stars) restricted to completed pickup orders.
   - Live synchronization with changes made in the Vendor Dashboard.

4. **Vendor Dashboard (`/dashboard`)**:
   - Protected route for vendor accounts (customers are automatically redirected home with a toast).
   - KPI summary cards (active items, pending pickups, estimated cash volume).
   - Mobile-friendly product publishing form (name, price, unit, category, description, availability switch).
   - Real-time Edit, Delete, and Availability toggles that immediately update public market pages.

5. **Pre-Order Cart & Checkout (`/cart`)**:
   - Cart items grouped by vendor and market stall.
   - Pickup window selection (e.g., Saturday 8:30 AM – 10:00 AM) and grower notes.
   - Instant confirmation screen reinforcing "Pay in person at pickup".

6. **Authentication & Session Persistence**:
   - Customer and Vendor account roles stored in `localStorage`.
   - Pre-orders, favourites, and product edits persist locally.

---

## 🔑 Demo Credentials

Test the prototype using these pre-configured accounts (or click the 1-click fill buttons on the `/login` screen):

| Role | Email | Password | Details |
| :--- | :--- | :--- | :--- |
| **Customer** | `customer@basket.ca` | `demo1234` | Claire Dubois (Customer pre-order access) |
| **Vendor** | `vendor@basket.ca` | `demo1234` | Eli & Sarah Martin, *Harvest Table Organics* (Full Vendor Dashboard access) |

*You can also register a brand new customer or vendor account on the `/signup` screen.*

---

## 🚀 Running the Prototype

```bash
# 1. Install dependencies
npm install

# 2. Start the local Vite development server (port 3000)
npm run dev

# 3. Build for production
npm run build
```

---

## 📁 Project Structure

```
├── index.html                  # HTML entry point with Fraunces & Plus Jakarta Sans fonts
├── metadata.json               # Applet capabilities & description
├── src/
│   ├── App.tsx                 # React Router v6 routing & layout wrappers
│   ├── main.tsx                # React DOM entry
│   ├── index.css               # Tailwind CSS theme & Leaflet styles
│   ├── data.js                 # 8 Ontario markets, vendors, products, reviews, and storage helpers
│   ├── context/
│   │   ├── AuthContext.jsx     # User session, cart, pre-orders, and favourites in localStorage
│   │   └── ToastContext.jsx    # Accessible, responsive toast notification system
│   ├── components/
│   │   ├── Header.jsx          # Search bar, cart counter, favourites, account links
│   │   ├── Footer.jsx          # Vendor dashboard, staff login, demo mode indicator
│   │   ├── MarketCard.jsx      # Market directory card with hours & vendor count
│   │   ├── ProductCard.jsx     # Produce card with quantity steppers and reserve CTA
│   │   └── OntarioMap.jsx      # Leaflet tile map + stylized Ontario SVG map fallback
│   ├── pages/
│   │   ├── Home.jsx            # Hero, map/list view toggle, city filter, market cards
│   │   ├── MarketDetail.jsx    # Hours table, announcements box, vendor stall links
│   │   ├── VendorDetail.jsx    # Weekly inventory, category filters, verified reviews
│   │   ├── VendorDashboard.jsx # Vendor KPI summary, add/edit/delete product catalogue
│   │   ├── Cart.jsx            # Grouped pre-order cart, pickup window selector, success screen
│   │   ├── Login.jsx           # Demo credentials callout & 1-click test fill
│   │   ├── Signup.jsx          # Customer vs Vendor registration with approval notice
│   │   ├── Account.jsx         # Profile info, role badge, order history, delete account dialog
│   │   ├── SearchResults.jsx   # Search results for markets and products
│   │   └── Favourites.jsx      # Bookmarked markets and farm stalls
└── README.md
```

---

## 🎨 Brand Design Specifications

- **Deep Green**: `#2F5D3A`
- **Cream**: `#FAF6EE`
- **Terracotta**: `#C96F4A`
- **Charcoal**: `#232323`
- **Typography**: `Fraunces` (Editorial Display & Headings) + `Plus Jakarta Sans` (Clean UI & Tabular Numbers)

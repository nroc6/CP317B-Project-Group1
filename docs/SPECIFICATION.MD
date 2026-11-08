# Basket Specification (As-Built Ground Truth)

> **Document Status:** Actuality / Ground Truth.  
> This specification describes the codebase **exactly as it is currently implemented**.  
> For the aspirational target architecture, security hardening plan, and prioritized engineering to-do backlog, see [`ROADMAP.md`](./ROADMAP.md).

---

## Architecture Header Block

1. **Trust boundary:** The application runs as a client-side React SPA in the browser. In the current prototype, there is no remote server API or database; all state and persistence are held directly in browser `localStorage`. Security and route gating are enforced via client React components and navigation hooks.
2. **Method contract:** Data operations are implemented as exported helper functions on `src/data.js` and custom hooks/methods on `src/context/AuthContext.jsx`. State synchronization across disparate components is maintained through custom DOM window events (`basket_products_updated`, `basket_orders_updated`, `basket_reviews_updated`).
3. **Entity relationships:** `User 1—0..* Order`, `User 1—0..* Favourite`, `Market 1—1..* Vendor`, `Vendor 1—0..* Product`, `Vendor 1—0..* Review`, `Order 1—1..* OrderItem`; multi-vendor cart checkouts partition items by vendor, producing $N$ distinct vendor orders.
4. **File paths:**
   - `User` → `src/context/AuthContext.jsx`
   - `Market` → `src/data.js`
   - `Vendor` → `src/data.js`
   - `Product` → `src/data.js`
   - `CartItem` → `src/context/AuthContext.jsx`
   - `Order` → `src/data.js` / `src/context/AuthContext.jsx`
   - `OrderItem` → `src/context/AuthContext.jsx`
   - `Review` → `src/data.js` / `src/pages/VendorDetail.jsx`
   - `Favourite` → `src/context/AuthContext.jsx`

---

## 1. User

| Field | Type | Key / Notes |
|---|---|---|
| `email` | `string` | Primary lookup identifier, unique |
| `password` | `string` | Plaintext in prototype demo store; stripped from active session state |
| `firstName` | `string` | User given name |
| `lastName` | `string` | User family name |
| `role` | `string` | Enum: `"customer"`, `"vendor"` |
| `vendorId` | `string \| undefined` | Foreign key to `Vendor.id`; present when `role === "vendor"` |
| `vendorName` | `string \| undefined` | Display name of producer stall |
| `marketId` | `string \| undefined` | Foreign key to `Market.id`; defaults to `"st-jacobs"` on registration |
| `city` | `string \| undefined` | Geographic municipality |
| `isApproved` | `boolean` | `true` for customers; `false` ("Pending admin approval") for new vendor accounts |
| `createdAt` | `string` | ISO calendar date string (`YYYY-MM-DD`) |

### User.login

Authenticates credentials against demo accounts or registered users in local storage; callable by an unauthenticated visitor.

```mermaid
sequenceDiagram
    autonumber
    actor V as Visitor
    participant User.login
    participant DB as LocalStorage

    V->>User.login: login(email, password)
    User.login->>DB: read DEMO_ACCOUNTS and basket_registered_users
    DB-->>User.login: accounts
    Note over User.login: guard — matching normalized email and exact password found
    alt valid credentials found
        User.login->>DB: write basket_auth_user (session user)
        DB-->>User.login: ok
        User.login-->>V: { success: true, user }
    else invalid credentials
        User.login-->>V: { success: false, error: "Invalid email or password" }
    end
```

### User.signup

Creates a new customer or vendor account record in local storage and establishes a session; callable by an unauthenticated visitor.

```mermaid
sequenceDiagram
    autonumber
    actor V as Visitor
    participant User.signup
    participant DB as LocalStorage

    V->>User.signup: signup({ firstName, lastName, email, password, role })
    User.signup->>DB: read basket_registered_users
    DB-->>User.signup: existingUsers
    Note over User.signup: guard — email does not already exist in registry
    alt email already registered
        User.signup-->>V: { success: false, error: "An account with this email already exists." }
    else email is unique
        User.signup->>DB: write updated basket_registered_users
        DB-->>User.signup: ok
        User.signup->>DB: write basket_auth_user (session user)
        DB-->>User.signup: ok
        User.signup-->>V: { success: true, user }
    end
```

### User.logout

Clears the active session user from memory and local storage; callable by an authenticated user.

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant User.logout
    participant DB as LocalStorage

    U->>User.logout: logout()
    User.logout->>DB: removeItem basket_auth_user
    DB-->>User.logout: ok
    User.logout-->>U: void
```

### User.deleteAccount

Removes the user session, resets the pre-order cart, and clears storage keys; callable by an authenticated user.

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant User.deleteAccount
    participant DB as LocalStorage

    U->>User.deleteAccount: deleteAccount()
    User.deleteAccount->>DB: removeItem basket_auth_user
    DB-->>User.deleteAccount: ok
    User.deleteAccount->>DB: removeItem basket_cart_items
    DB-->>User.deleteAccount: ok
    User.deleteAccount-->>U: void
```

---

## 2. Market

| Field | Type | Key / Notes |
|---|---|---|
| `id` | `string` | Primary key (e.g. `"st-jacobs"`, `"byward"`) |
| `name` | `string` | Formal market name |
| `city` | `string` | Municipality with regional context |
| `region` | `string` | Ontario geographic territory |
| `address` | `string` | Street address with postal code |
| `lat` | `number` | WGS84 latitude coordinate for map pin |
| `lng` | `number` | WGS84 longitude coordinate for map pin |
| `season` | `string` | Operating seasonal calendar |
| `hoursTable` | `Array<{ day: string, hours: string }>` | Operating hours schedule table |
| `summaryHours` | `string` | Abbreviated schedule for overview cards |
| `description` | `string` | Market history and community background |
| `announcement` | `object` | Embedded `{ title, date, content, image }` |
| `vendorIds` | `Array<string>` | Foreign key list to `Vendor.id` |
| `heroImage` | `string` | Banner visual asset URL |

**Methods:** none — read-only catalog initialized from static configuration in `src/data.js`. No separate diagram.

---

## 3. Vendor

| Field | Type | Key / Notes |
|---|---|---|
| `id` | `string` | Primary key (e.g. `"v-harvest-table"`) |
| `name` | `string` | Farm or bakery business name |
| `marketId` | `string` | Foreign key referencing `Market.id` |
| `marketName` | `string` | Denormalized display name of attended market |
| `city` | `string` | Producer home municipality |
| `category` | `string` | Producer category: `"Produce"`, `"Bakery"`, `"Honey & Preserves"`, `"Dairy & Cheese"`, `"Meats & Dairy"` |
| `shortDescription` | `string` | One-sentence summary for cards |
| `fullDescription` | `string` | Detailed agricultural practices narrative |
| `rating` | `number` | Average completed-order star rating (1.0–5.0) |
| `reviewCount` | `number` | Total number of customer reviews |
| `image` | `string` | Card thumbnail image asset URL |
| `bannerImage` | `string` | Stall header image asset URL |
| `stallLocation` | `string` | Physical stall location inside the market |
| `pickupInstructions` | `string` | Customer pickup and payment directions |

**Methods:** none — read-only catalog initialized from static configuration in `src/data.js`. No separate diagram.

---

## 4. Product

| Field | Type | Key / Notes |
|---|---|---|
| `id` | `string` | Primary key (e.g. `"p-sweet-corn"`, `"p-<timestamp>"`) |
| `vendorId` | `string` | Foreign key referencing `Vendor.id` |
| `name` | `string` | Crop or baked item title |
| `price` | `number` | Unit price in CAD |
| `unit` | `string` | Sold unit description (e.g. `"dozen"`, `"loaf"`, `"500ml glass bottle"`) |
| `category` | `string` | Crop category matching vendor domain |
| `description` | `string` | Harvesting notes, culinary profile, storage |
| `isAvailable` | `boolean` | Availability toggle (`true` = available this week, `false` = sold out) |
| `image` | `string` | Thumbnail asset URL |

### Product.getStoredProducts

Retrieves the current product list from local storage or falls back to initial defaults; callable by any visitor, customer, or vendor.

```mermaid
sequenceDiagram
    autonumber
    actor V as Visitor
    participant Product.getStoredProducts
    participant DB as LocalStorage

    V->>Product.getStoredProducts: getStoredProducts()
    Product.getStoredProducts->>DB: getItem basket_products_data
    DB-->>Product.getStoredProducts: rawJson
    Note over Product.getStoredProducts: guard — entry exists in local storage
    alt stored records exist
        Product.getStoredProducts-->>V: JSON.parse(rawJson)
    else no record in storage
        Product.getStoredProducts->>DB: setItem basket_products_data (INITIAL_PRODUCTS)
        DB-->>Product.getStoredProducts: ok
        Product.getStoredProducts-->>V: INITIAL_PRODUCTS
    end
```

### Product.saveStoredProducts

Persists the full product array into local storage and dispatches a window update event; callable by a vendor from the dashboard.

```mermaid
sequenceDiagram
    autonumber
    actor V as Vendor
    participant Product.saveStoredProducts
    participant DB as LocalStorage

    V->>Product.saveStoredProducts: saveStoredProducts(products)
    Product.saveStoredProducts->>DB: setItem basket_products_data (JSON)
    DB-->>Product.saveStoredProducts: ok
    Note over Product.saveStoredProducts: dispatches Event "basket_products_updated"
    Product.saveStoredProducts-->>V: void
```

---

## 5. CartItem

| Field | Type | Key / Notes |
|---|---|---|
| `id` | `string` | Primary key (`"cart-item-<timestamp>-<hash>"`) |
| `productId` | `string` | Foreign key referencing `Product.id` |
| `name` | `string` | Denormalized snapshot of product name |
| `price` | `number` | Snapshot unit price in CAD |
| `unit` | `string` | Packaging unit |
| `image` | `string` | Display asset URL |
| `quantity` | `number` | Integer reserve quantity |
| `vendorId` | `string` | Foreign key referencing `Vendor.id` |
| `vendorName` | `string` | Denormalized vendor title |
| `marketId` | `string` | Foreign key referencing `Market.id` |
| `marketName` | `string` | Denormalized market title |
| `stallLocation` | `string` | Stall location instructions |

### CartItem.addToCart

Appends a reserved product to the customer cart or increments existing quantity; callable by a customer.

```mermaid
sequenceDiagram
    autonumber
    actor C as Customer
    participant CartItem.addToCart
    participant DB as LocalStorage

    C->>CartItem.addToCart: addToCart(product, vendor, market, quantity)
    Note over CartItem.addToCart: guard — item with productId already in cart
    alt item exists in cart
        Note over CartItem.addToCart: existingItem.quantity += quantity
    else new item
        Note over CartItem.addToCart: construct CartItem record
    end
    CartItem.addToCart->>DB: setItem basket_cart_items (JSON)
    DB-->>CartItem.addToCart: ok
    CartItem.addToCart-->>C: void
```

### CartItem.updateCartQuantity

Modifies an item's reserve quantity in the cart or delegates removal if quantity is zero or less; callable by a customer.

```mermaid
sequenceDiagram
    autonumber
    actor C as Customer
    participant CartItem.updateCartQuantity
    participant CartItem.removeFromCart
    participant DB as LocalStorage

    C->>CartItem.updateCartQuantity: updateCartQuantity(cartItemId, quantity)
    Note over CartItem.updateCartQuantity: guard — quantity <= 0
    alt quantity <= 0
        CartItem.updateCartQuantity->>CartItem.removeFromCart: removeFromCart(cartItemId)
        CartItem.removeFromCart-->>CartItem.updateCartQuantity: void
        CartItem.updateCartQuantity-->>C: void
    else quantity > 0
        Note over CartItem.updateCartQuantity: item.quantity = quantity
        CartItem.updateCartQuantity->>DB: setItem basket_cart_items (JSON)
        DB-->>CartItem.updateCartQuantity: ok
        CartItem.updateCartQuantity-->>C: void
    end
```

### CartItem.removeFromCart

Deletes a product entry from the active cart state; callable by a customer.

```mermaid
sequenceDiagram
    autonumber
    actor C as Customer
    participant CartItem.removeFromCart
    participant DB as LocalStorage

    C->>CartItem.removeFromCart: removeFromCart(cartItemId)
    Note over CartItem.removeFromCart: filter items matching cartItemId
    CartItem.removeFromCart->>DB: setItem basket_cart_items (JSON)
    DB-->>CartItem.removeFromCart: ok
    CartItem.removeFromCart-->>C: void
```

### CartItem.clearCart

Purges all entries from the pre-order cart; callable by a customer or internal order finalization.

```mermaid
sequenceDiagram
    autonumber
    actor C as Customer
    participant CartItem.clearCart
    participant DB as LocalStorage

    C->>CartItem.clearCart: clearCart()
    Note over CartItem.clearCart: reset cart state to []
    CartItem.clearCart->>DB: setItem basket_cart_items ("[]")
    DB-->>CartItem.clearCart: ok
    CartItem.clearCart-->>C: void
```

---

## 6. Order

| Field | Type | Key / Notes |
|---|---|---|
| `id` | `string` | Primary key format `"ORD-<4-digit-id>"` |
| `date` | `string` | Order submission date (`YYYY-MM-DD`) |
| `customerEmail` | `string` | Foreign key to `User.email` |
| `customerName` | `string` | Full name of pre-ordering customer |
| `vendorId` | `string` | Foreign key to `Vendor.id` |
| `vendorName` | `string` | Denormalized producer stall title |
| `marketId` | `string` | Foreign key to `Market.id` |
| `marketName` | `string` | Denormalized market title |
| `pickupWindow` | `string` | Selected pickup timeframe |
| `customerNote` | `string` | Optional customer note to grower |
| `items` | `Array<OrderItem>` | Embedded list of reserved crops |
| `total` | `number` | Computed CAD sum due in person at stall |
| `status` | `string` | Enum: `"Awaiting Pickup (Pay in Person)"`, `"Completed (Paid in person)"` |
| `paymentMethod` | `string` | Fixed note: `"Pay in person at pickup (Cash, Debit, or e-Transfer)"` |

### Order.getStoredOrders

Retrieves existing customer and vendor pre-orders from local storage or defaults to initial seed data; callable by an authenticated customer or vendor.

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant Order.getStoredOrders
    participant DB as LocalStorage

    U->>Order.getStoredOrders: getStoredOrders()
    Order.getStoredOrders->>DB: getItem basket_orders_data
    DB-->>Order.getStoredOrders: rawJson
    Note over Order.getStoredOrders: guard — stored orders exist in local storage
    alt orders exist
        Order.getStoredOrders-->>U: JSON.parse(rawJson)
    else no orders recorded
        Order.getStoredOrders->>DB: setItem basket_orders_data (INITIAL_ORDERS)
        DB-->>Order.getStoredOrders: ok
        Order.getStoredOrders-->>U: INITIAL_ORDERS
    end
```

### Order.saveStoredOrders

Persists orders array to local storage and triggers an update event; callable by the pre-order submission routine.

```mermaid
sequenceDiagram
    autonumber
    participant Caller as Order.placePreOrder
    participant Order.saveStoredOrders
    participant DB as LocalStorage

    Caller->>Order.saveStoredOrders: saveStoredOrders(orders)
    Order.saveStoredOrders->>DB: setItem basket_orders_data (JSON)
    DB-->>Order.saveStoredOrders: ok
    Note over Order.saveStoredOrders: dispatches Event "basket_orders_updated"
    Order.saveStoredOrders-->>Caller: void
```

### Order.placePreOrder

Partitions cart items by vendor, generates new order entities with initial status `"Awaiting Pickup (Pay in Person)"`, saves them, and clears the cart; callable by a customer.

```mermaid
sequenceDiagram
    autonumber
    actor C as Customer
    participant Order.placePreOrder
    participant Order.getStoredOrders
    participant Order.saveStoredOrders
    participant CartItem.clearCart
    participant DB as LocalStorage

    C->>Order.placePreOrder: placePreOrder({ pickupWindow, customerNote })
    Note over Order.placePreOrder: guard — cart.length > 0
    alt cart is empty
        Order.placePreOrder-->>C: null
    else cart has items
        Note over Order.placePreOrder: partition items by vendorId<br/>compute subtotal per vendor<br/>set status = "Awaiting Pickup (Pay in Person)"
        Order.placePreOrder->>Order.getStoredOrders: getStoredOrders()
        Order.getStoredOrders-->>Order.placePreOrder: currentOrders
        Order.placePreOrder->>Order.saveStoredOrders: saveStoredOrders([newOrders, ...currentOrders])
        Order.saveStoredOrders->>DB: setItem basket_orders_data
        DB-->>Order.saveStoredOrders: ok
        Order.saveStoredOrders-->>Order.placePreOrder: void
        Order.placePreOrder->>CartItem.clearCart: clearCart()
        CartItem.clearCart->>DB: setItem basket_cart_items ("[]")
        DB-->>CartItem.clearCart: ok
        CartItem.clearCart-->>Order.placePreOrder: void
        Order.placePreOrder-->>C: newOrders
    end
```

---

## 7. OrderItem

| Field | Type | Key / Notes |
|---|---|---|
| `id` | `string` | Foreign key referencing `Product.id` |
| `name` | `string` | Snapshot crop name at order creation |
| `quantity` | `number` | Quantity reserved |
| `price` | `number` | Snapshot unit price in CAD |
| `unit` | `string` | Snapshot crop packaging unit |

**Methods:** none — embedded document array inside `Order.items` created during `Order.placePreOrder`. No separate diagram.

---

## 8. Review

| Field | Type | Key / Notes |
|---|---|---|
| `id` | `string` | Primary key (`"r-1"`, `"rev-<timestamp>"`) |
| `vendorId` | `string` | Foreign key referencing `Vendor.id` |
| `customerName` | `string` | Customer display name |
| `orderId` | `string` | Foreign key referencing `Order.id` |
| `verifiedOrder` | `boolean` | Set to `true` ("Completed order") |
| `date` | `string` | Human-readable relative date label |
| `rating` | `number` | Integer rating value (1 to 5) |
| `comment` | `string` | Feedback text |

### Review.getStoredReviews

Retrieves stored reviews or defaults to initial seed reviews; callable by any visitor or customer.

```mermaid
sequenceDiagram
    autonumber
    actor V as Visitor
    participant Review.getStoredReviews
    participant DB as LocalStorage

    V->>Review.getStoredReviews: getStoredReviews()
    Review.getStoredReviews->>DB: getItem basket_reviews_data
    DB-->>Review.getStoredReviews: rawJson
    Note over Review.getStoredReviews: guard — reviews exist in storage
    alt reviews exist
        Review.getStoredReviews-->>V: JSON.parse(rawJson)
    else no reviews found
        Review.getStoredReviews->>DB: setItem basket_reviews_data (INITIAL_REVIEWS)
        DB-->>Review.getStoredReviews: ok
        Review.getStoredReviews-->>V: INITIAL_REVIEWS
    end
```

### Review.saveStoredReviews

Persists updated reviews array to local storage and dispatches a change event; callable by a customer leaving feedback.

```mermaid
sequenceDiagram
    autonumber
    actor C as Customer
    participant Review.saveStoredReviews
    participant DB as LocalStorage

    C->>Review.saveStoredReviews: saveStoredReviews(reviews)
    Review.saveStoredReviews->>DB: setItem basket_reviews_data (JSON)
    DB-->>Review.saveStoredReviews: ok
    Note over Review.saveStoredReviews: dispatches Event "basket_reviews_updated"
    Review.saveStoredReviews-->>C: void
```

---

## 9. Favourite

| Field | Type | Key / Notes |
|---|---|---|
| `id` | `string` | Primary key; foreign key to either `Market.id` or `Vendor.id` |

### Favourite.toggleFavourite

Adds or removes a target market or vendor ID from the user's bookmarked list; callable by any user.

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant Favourite.toggleFavourite
    participant DB as LocalStorage

    U->>Favourite.toggleFavourite: toggleFavourite(id)
    Note over Favourite.toggleFavourite: guard — id already in favourites list
    alt id in favourites
        Note over Favourite.toggleFavourite: filter out id
    else id not in favourites
        Note over Favourite.toggleFavourite: append id to list
    end
    Favourite.toggleFavourite->>DB: setItem basket_favourites (JSON)
    DB-->>Favourite.toggleFavourite: ok
    Favourite.toggleFavourite-->>U: void
```

### Favourite.isFavourite

Evaluates whether a given entity identifier is saved in the user's favourites list; callable by any user.

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant Favourite.isFavourite

    U->>Favourite.isFavourite: isFavourite(id)
    Note over Favourite.isFavourite: check favourites.includes(id)
    Favourite.isFavourite-->>U: boolean
```

---

## 10. Architectural Boundaries & Cross-References

- **Client-Side Persistence:** Application state is managed via `localStorage` keys (`basket_auth_user`, `basket_cart_items`, `basket_products_data`, `basket_orders_data`, `basket_reviews_data`, `basket_favourites`).
- **Client Route Gating:** Role-based access is evaluated in page components (e.g., `VendorDashboard.jsx` redirects customers to home with a toast).
- **Target Roadmap:** For planned database migration, server-side RBAC, authoritative price validation, and the order transition state machine, see [`ROADMAP.md`](./ROADMAP.md).

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured, apiRequest } from '../lib/supabase.js';

const AuthContext = createContext(null);

// The unsubmitted cart is the only state still kept in localStorage.
const CART_STORAGE_KEY = 'basket_cart_items';
const DEMO_EMAILS = ['customer@basket.ca', 'vendor@basket.ca'];
const NOT_CONFIGURED_RESULT = {
  success: false,
  error: 'Supabase is not configured. Check your .env file.',
};

// Reads the saved cart from localStorage, falling back to an empty cart.
function loadStoredCart() {
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Holds the session, signed-in actor, orders, favourites and cart for the whole app.
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [favourites, setFavourites] = useState([]);
  const [cart, setCart] = useState(loadStoredCart);

  // Persist the cart whenever it changes.
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (e) {
      console.error('Error persisting cart', e);
    }
  }, [cart]);

  // Drops all per-user data (used on sign-out and when the session ends).
  const clearPrivateState = useCallback(() => {
    setUser(null);
    setOrders([]);
    setFavourites([]);
  }, []);

  // Loads the actor profile, orders and favourites from the API for a session.
  const hydrateAuthenticatedState = useCallback(
    async (activeSession) => {
      if (!activeSession?.access_token) {
        clearPrivateState();
        return null;
      }

      const token = activeSession.access_token;
      const [meRes, ordersRes, favsRes] = await Promise.all([
        apiRequest('/api/me', {}, token),
        apiRequest('/api/orders', {}, token).catch(() => ({ orders: [] })),
        apiRequest('/api/favourites', {}, token).catch(() => ({ favourites: [] })),
      ]);

      setUser(meRes.user || null);
      setOrders(ordersRes.orders || []);
      setFavourites(favsRes.favourites || []);
      return meRes.user || null;
    },
    [clearPrivateState]
  );

  // Restore any existing session on load, then keep in sync with Supabase auth events.
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setAuthLoading(false);
      return;
    }

    let mounted = true;

    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (!mounted) return;
        setSession(data.session || null);
        if (data.session) {
          try {
            await hydrateAuthenticatedState(data.session);
          } catch (err) {
            console.error('Failed to hydrate session profile:', err);
          }
        }
      })
      .finally(() => {
        if (mounted) setAuthLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession || null);
      if (nextSession) {
        hydrateAuthenticatedState(nextSession).catch((err) => {
          console.error('Failed to refresh actor state:', err);
        });
      } else {
        clearPrivateState();
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [hydrateAuthenticatedState, clearPrivateState]);

  const accessToken = session?.access_token || null;

  // Re-fetches the actor's orders from the API.
  const refreshOrders = useCallback(async () => {
    if (!accessToken) return [];
    const data = await apiRequest('/api/orders', {}, accessToken);
    setOrders(data.orders || []);
    return data.orders || [];
  }, [accessToken]);

  // Signs in with email/password; returns { success, user } or { success: false, error }.
  const login = useCallback(
    async (email, password) => {
      if (!isSupabaseConfigured || !supabase) return NOT_CONFIGURED_RESULT;

      const normalizedEmail = email.trim().toLowerCase();
      const signIn = () => supabase.auth.signInWithPassword({ email: normalizedEmail, password });
      let signInRes = await signIn();

      // First demo login: ask the server to create the demo accounts, then retry once.
      if (signInRes.error && DEMO_EMAILS.includes(normalizedEmail)) {
        try {
          await apiRequest('/api/demo/ensure-accounts', { method: 'POST' });
          signInRes = await signIn();
        } catch {
          // Ignore bootstrap errors and surface the original sign-in error.
        }
      }

      if (signInRes.error || !signInRes.data.session) {
        return {
          success: false,
          error: signInRes.error?.message || 'Invalid email or password.',
        };
      }

      setSession(signInRes.data.session);
      const actor = await hydrateAuthenticatedState(signInRes.data.session);
      return { success: true, user: actor };
    },
    [hydrateAuthenticatedState]
  );

  // Creates a Supabase Auth user; profile/vendor rows are created by DB triggers from the metadata.
  const signup = useCallback(
    async ({ firstName, lastName, email, password, role, vendorName }) => {
      if (!isSupabaseConfigured || !supabase) return NOT_CONFIGURED_RESULT;

      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            role: role === 'vendor' ? 'vendor' : 'customer',
            vendor_name: vendorName ? vendorName.trim() : `${firstName.trim()}'s Farm Stand`,
          },
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      // No session means the project requires email confirmation first.
      if (!data.session) {
        return { success: true, requiresEmailConfirmation: true, user: null };
      }

      setSession(data.session);
      const actor = await hydrateAuthenticatedState(data.session);
      return { success: true, requiresEmailConfirmation: false, user: actor };
    },
    [hydrateAuthenticatedState]
  );

  // Signs out and clears all per-user state.
  const logout = useCallback(async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setSession(null);
    clearPrivateState();
  }, [clearPrivateState]);

  // Deletes the account on the server, then signs out and empties the cart.
  const deleteAccount = useCallback(async () => {
    if (!accessToken) {
      throw new Error('You must be signed in to delete your account.');
    }
    await apiRequest('/api/account', { method: 'DELETE' }, accessToken);
    await logout();
    setCart([]);
    localStorage.removeItem(CART_STORAGE_KEY);
  }, [accessToken, logout]);

  // --- Cart (client-side until checkout) ---

  // Adds a product to the cart, or bumps its quantity if it's already there.
  const addToCart = useCallback((product, vendor, market, quantity = 1) => {
    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => item.productId === product.id);
      if (existingIndex > -1) {
        const next = [...prev];
        next[existingIndex] = {
          ...next[existingIndex],
          quantity: next[existingIndex].quantity + quantity,
        };
        return next;
      }
      return [
        ...prev,
        {
          id: 'cart-item-' + Date.now() + Math.random().toString(36).slice(2, 6),
          productId: product.id,
          name: product.name,
          price: product.price,
          unit: product.unit,
          image: product.image,
          quantity,
          vendorId: vendor.id,
          vendorName: vendor.name,
          marketId: market.id,
          marketName: market.name,
          stallLocation: vendor.stallLocation || 'Main Pavilion',
        },
      ];
    });
  }, []);

  const removeFromCart = useCallback((cartItemId) => {
    setCart((prev) => prev.filter((item) => item.id !== cartItemId));
  }, []);

  // Sets an item's quantity; zero or less removes it.
  const updateCartQuantity = useCallback(
    (cartItemId, quantity) => {
      if (quantity <= 0) {
        removeFromCart(cartItemId);
        return;
      }
      setCart((prev) =>
        prev.map((item) => (item.id === cartItemId ? { ...item, quantity } : item))
      );
    },
    [removeFromCart]
  );

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  // --- Orders & favourites (server-authoritative) ---

  // Submits the cart; the server re-prices it and returns one order per vendor.
  const placePreOrder = useCallback(
    async ({ pickupWindow, customerNote }) => {
      if (cart.length === 0) return null;
      if (!accessToken) {
        throw new Error('Please log in to place a pre-order.');
      }

      const payload = {
        pickupWindow,
        customerNote,
        items: cart.map((item) => ({ productId: item.productId, quantity: item.quantity })),
      };

      const res = await apiRequest(
        '/api/orders',
        { method: 'POST', body: JSON.stringify(payload) },
        accessToken
      );

      const created = res.orders || [];
      setOrders((prev) => [...created, ...prev]);
      clearCart();
      return created;
    },
    [cart, accessToken, clearCart]
  );

  // Changes an order's status (complete / no-show / cancel) and updates it locally.
  const transitionOrderStatus = useCallback(
    async (orderId, targetStatus) => {
      if (!accessToken) {
        throw new Error('Authentication required.');
      }
      const res = await apiRequest(
        `/api/orders/${encodeURIComponent(orderId)}/status`,
        { method: 'PATCH', body: JSON.stringify({ status: targetStatus }) },
        accessToken
      );
      const updated = res.order;
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      return updated;
    },
    [accessToken]
  );

  // Saves or un-saves a market/vendor; returns true if it's now saved.
  const toggleFavourite = useCallback(
    async (targetId, targetType = 'market') => {
      if (!accessToken) {
        throw new Error('Please log in to save favourites.');
      }
      const res = await apiRequest(
        '/api/favourites/toggle',
        { method: 'POST', body: JSON.stringify({ targetType, targetId }) },
        accessToken
      );
      setFavourites((prev) => {
        if (res.saved) {
          return prev.includes(targetId) ? prev : [...prev, targetId];
        }
        return prev.filter((id) => id !== targetId);
      });
      return res.saved;
    },
    [accessToken]
  );

  const isFavourite = useCallback((id) => favourites.includes(id), [favourites]);

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        accessToken,
        authLoading,
        isSupabaseConfigured,
        isAuthenticated: !!user,
        isVendor: user?.role === 'vendor',
        isCustomer: user?.role === 'customer',
        cart,
        cartTotal,
        cartItemCount,
        orders,
        favourites,
        login,
        signup,
        logout,
        deleteAccount,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        placePreOrder,
        refreshOrders,
        transitionOrderStatus,
        toggleFavourite,
        isFavourite,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Hook for reading auth/cart state; must be used inside <AuthProvider>.
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

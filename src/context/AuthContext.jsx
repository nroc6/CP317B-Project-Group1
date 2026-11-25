/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured, apiRequest } from '../lib/supabase.js';

const AuthContext = createContext(null);

const CART_STORAGE_KEY = 'basket_cart_items';

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [favourites, setFavourites] = useState([]);

  // Unsubmitted shopping cart remains local until submitted to POST /api/orders
  const [cart, setCart] = useState(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (e) {
      console.error('Error persisting cart', e);
    }
  }, [cart]);

  const hydrateAuthenticatedState = useCallback(async (activeSession) => {
    if (!activeSession?.access_token) {
      setUser(null);
      setOrders([]);
      setFavourites([]);
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
  }, []);

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
        setUser(null);
        setOrders([]);
        setFavourites([]);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [hydrateAuthenticatedState]);

  const accessToken = session?.access_token || null;

  const refreshOrders = useCallback(async () => {
    if (!accessToken) return [];
    const data = await apiRequest('/api/orders', {}, accessToken);
    setOrders(data.orders || []);
    return data.orders || [];
  }, [accessToken]);

  const login = useCallback(
    async (email, password) => {
      if (!isSupabaseConfigured || !supabase) {
        return {
          success: false,
          error: 'Supabase is not configured. Check your .env file.',
        };
      }

      const normalizedEmail = email.trim().toLowerCase();
      let signInRes = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      // Automatically provision demo accounts in Supabase Auth if using demo credentials for the first time
      if (
        signInRes.error &&
        (normalizedEmail === 'customer@basket.ca' || normalizedEmail === 'vendor@basket.ca')
      ) {
        try {
          await apiRequest('/api/demo/ensure-accounts', { method: 'POST' });
          signInRes = await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password,
          });
        } catch {
          // Ignore bootstrap error and surface original sign-in error
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

  const signup = useCallback(
    async ({ firstName, lastName, email, password, role, vendorName }) => {
      if (!isSupabaseConfigured || !supabase) {
        return {
          success: false,
          error: 'Supabase is not configured. Check your .env file.',
        };
      }

      const normalizedEmail = email.trim().toLowerCase();
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
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

      if (!data.session) {
        return {
          success: true,
          requiresEmailConfirmation: true,
          user: null,
        };
      }

      setSession(data.session);
      const actor = await hydrateAuthenticatedState(data.session);
      return { success: true, requiresEmailConfirmation: false, user: actor };
    },
    [hydrateAuthenticatedState]
  );

  const logout = useCallback(async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setSession(null);
    setUser(null);
    setOrders([]);
    setFavourites([]);
  }, []);

  const deleteAccount = useCallback(async () => {
    if (!accessToken) {
      throw new Error('You must be signed in to delete your account.');
    }
    await apiRequest('/api/account', { method: 'DELETE' }, accessToken);
    if (supabase) {
      await supabase.auth.signOut();
    }
    setSession(null);
    setUser(null);
    setOrders([]);
    setFavourites([]);
    setCart([]);
    localStorage.removeItem(CART_STORAGE_KEY);
  }, [accessToken]);

  // Client-side unsubmitted cart operations
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

  // Authoritative server-side pre-order creation (computes prices & splits by vendor)
  const placePreOrder = useCallback(
    async ({ pickupWindow, customerNote }) => {
      if (cart.length === 0) return null;
      if (!accessToken) {
        throw new Error('Please log in to place a pre-order.');
      }

      const payload = {
        pickupWindow,
        customerNote,
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      };

      const res = await apiRequest(
        '/api/orders',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
        accessToken
      );

      const created = res.orders || [];
      setOrders((prev) => [...created, ...prev]);
      clearCart();
      return created;
    },
    [cart, accessToken, clearCart]
  );

  const transitionOrderStatus = useCallback(
    async (orderId, targetStatus) => {
      if (!accessToken) {
        throw new Error('Authentication required.');
      }
      const res = await apiRequest(
        `/api/orders/${encodeURIComponent(orderId)}/status`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status: targetStatus }),
        },
        accessToken
      );
      const updated = res.order;
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      return updated;
    },
    [accessToken]
  );

  // Authenticated favourites toggle
  const toggleFavourite = useCallback(
    async (targetId, targetType = 'market') => {
      if (!accessToken) {
        throw new Error('Please log in to save favourites.');
      }
      const res = await apiRequest(
        '/api/favourites/toggle',
        {
          method: 'POST',
          body: JSON.stringify({ targetType, targetId }),
        },
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

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

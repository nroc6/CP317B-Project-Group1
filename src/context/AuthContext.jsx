/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getStoredOrders, saveStoredOrders } from '../data.js';

const AuthContext = createContext(null);

const STORAGE_KEYS = {
  USER: 'basket_auth_user',
  CART: 'basket_cart_items',
  FAVOURITES: 'basket_favourites',
};

// Default pre-seeded demo accounts
const DEMO_ACCOUNTS = [
  {
    email: 'customer@basket.ca',
    password: 'demo1234',
    firstName: 'Claire',
    lastName: 'Dubois',
    role: 'customer',
    city: 'Kitchener',
    createdAt: '2026-04-10',
    isApproved: true,
  },
  {
    email: 'vendor@basket.ca',
    password: 'demo1234',
    firstName: 'Eli & Sarah',
    lastName: 'Martin',
    role: 'vendor',
    vendorId: 'v-harvest-table',
    vendorName: 'Harvest Table Organics',
    marketId: 'st-jacobs',
    marketName: "St. Jacobs Farmers' Market",
    city: 'Woolwich',
    createdAt: '2026-01-15',
    isApproved: true,
  },
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.USER);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [cart, setCart] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CART);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [favourites, setFavourites] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.FAVOURITES);
      return stored ? JSON.parse(stored) : ['st-jacobs', 'v-harvest-table'];
    } catch {
      return ['st-jacobs', 'v-harvest-table'];
    }
  });

  const [orders, setOrders] = useState(() => getStoredOrders());

  useEffect(() => {
    const handleOrdersUpdate = () => {
      setOrders(getStoredOrders());
    };
    window.addEventListener('basket_orders_updated', handleOrdersUpdate);
    return () => window.removeEventListener('basket_orders_updated', handleOrdersUpdate);
  }, []);

  // Sync state to localStorage
  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      } else {
        localStorage.removeItem(STORAGE_KEYS.USER);
      }
    } catch (e) {
      console.error('Error persisting user', e);
    }
  }, [user]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart));
    } catch (e) {
      console.error('Error persisting cart', e);
    }
  }, [cart]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.FAVOURITES, JSON.stringify(favourites));
    } catch (e) {
      console.error('Error persisting favourites', e);
    }
  }, [favourites]);

  // Auth actions
  const login = useCallback(async (email, password) => {
    const normalizedEmail = email.trim().toLowerCase();
    
    // Check known demo accounts first
    const foundDemo = DEMO_ACCOUNTS.find(
      (a) => a.email.toLowerCase() === normalizedEmail && a.password === password
    );

    if (foundDemo) {
      const sessionUser = { ...foundDemo };
      delete sessionUser.password;
      setUser(sessionUser);
      return { success: true, user: sessionUser };
    }

    // Check custom registered accounts stored in localStorage
    try {
      const registeredUsers = JSON.parse(localStorage.getItem('basket_registered_users') || '[]');
      const foundCustom = registeredUsers.find(
        (u) => u.email.toLowerCase() === normalizedEmail && u.password === password
      );
      if (foundCustom) {
        const sessionUser = { ...foundCustom };
        delete sessionUser.password;
        setUser(sessionUser);
        return { success: true, user: sessionUser };
      }
    } catch (e) {
      console.error(e);
    }

    return { success: false, error: 'Invalid email or password. Use demo credentials shown below.' };
  }, []);

  const signup = useCallback(async ({ firstName, lastName, email, password, role }) => {
    const normalizedEmail = email.trim().toLowerCase();
    
    const newUser = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: normalizedEmail,
      password,
      role: role || 'customer',
      vendorId: role === 'vendor' ? 'v-custom-' + Date.now() : undefined,
      vendorName: role === 'vendor' ? `${firstName}'s Farm Stand` : undefined,
      marketId: 'st-jacobs',
      isApproved: role !== 'vendor', // Vendors pending approval
      createdAt: new Date().toISOString().split('T')[0],
    };

    try {
      const existing = JSON.parse(localStorage.getItem('basket_registered_users') || '[]');
      if (existing.some((u) => u.email.toLowerCase() === normalizedEmail)) {
        return { success: false, error: 'An account with this email already exists.' };
      }
      existing.push(newUser);
      localStorage.setItem('basket_registered_users', JSON.stringify(existing));
    } catch (e) {
      console.error(e);
    }

    const sessionUser = { ...newUser };
    delete sessionUser.password;
    setUser(sessionUser);
    return { success: true, user: sessionUser };
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  const deleteAccount = useCallback(() => {
    setUser(null);
    setCart([]);
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.CART);
  }, []);

  // Cart actions
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
          id: 'cart-item-' + Date.now() + Math.random().toString(36).substr(2, 4),
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

  const updateCartQuantity = useCallback((cartItemId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(cartItemId);
      return;
    }
    setCart((prev) =>
      prev.map((item) => (item.id === cartItemId ? { ...item, quantity } : item))
    );
  }, []);

  const removeFromCart = useCallback((cartItemId) => {
    setCart((prev) => prev.filter((item) => item.id !== cartItemId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  // Pre-order submission (Always Pay in Person at Pickup)
  const placePreOrder = useCallback(({ pickupWindow, customerNote }) => {
    if (cart.length === 0) return null;

    // Group cart items by vendor/market to generate friendly orders
    const ordersByVendor = {};
    cart.forEach((item) => {
      if (!ordersByVendor[item.vendorId]) {
        ordersByVendor[item.vendorId] = {
          vendorId: item.vendorId,
          vendorName: item.vendorName,
          marketId: item.marketId,
          marketName: item.marketName,
          items: [],
          total: 0,
        };
      }
      ordersByVendor[item.vendorId].items.push({
        id: item.productId,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        unit: item.unit,
      });
      ordersByVendor[item.vendorId].total += item.price * item.quantity;
    });

    const newOrders = Object.values(ordersByVendor).map((group, idx) => ({
      id: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toISOString().split('T')[0],
      customerEmail: user?.email || 'guest@basket.ca',
      customerName: user ? `${user.firstName} ${user.lastName}` : 'Guest Customer',
      vendorId: group.vendorId,
      vendorName: group.vendorName,
      marketId: group.marketId,
      marketName: group.marketName,
      pickupWindow: pickupWindow || 'Saturday, 9:00 AM – 11:00 AM',
      customerNote: customerNote || '',
      items: group.items,
      total: group.total,
      status: 'Awaiting Pickup (Pay in Person)',
      paymentMethod: 'Pay in person at pickup (Cash, Debit, or e-Transfer)',
    }));

    const currentOrders = getStoredOrders();
    const updatedOrders = [...newOrders, ...currentOrders];
    saveStoredOrders(updatedOrders);
    setOrders(updatedOrders);
    clearCart();

    return newOrders;
  }, [cart, user, clearCart]);

  // Favourites actions
  const toggleFavourite = useCallback((id) => {
    setFavourites((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      return [...prev, id];
    });
  }, []);

  const isFavourite = useCallback((id) => favourites.includes(id), [favourites]);

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <AuthContext.Provider
      value={{
        user,
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

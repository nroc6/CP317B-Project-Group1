/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

// Border/icon styling for each toast type (success is the default).
const TOAST_STYLES = {
  success: { box: 'bg-white border-[#2F5D3A]', Icon: CheckCircle2, iconColor: 'text-[#2F5D3A]' },
  info: { box: 'bg-white border-[#2F5D3A]/20', Icon: Info, iconColor: 'text-[#2F5D3A]' },
  error: { box: 'bg-[#FAF6EE] border-[#C96F4A]', Icon: AlertCircle, iconColor: 'text-[#C96F4A]' },
};

// Provides addToast() and renders the stack of notifications in the bottom-right corner.
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  // Shows a toast; it auto-dismisses after `duration` ms (0 keeps it until closed).
  const addToast = useCallback((message, type = 'success', duration = 3500) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {/* Toast stack */}
      <div
        className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
        aria-live="polite"
      >
        {toasts.map((toast) => {
          const { box, Icon, iconColor } = TOAST_STYLES[toast.type] || TOAST_STYLES.success;
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-lg border text-sm text-[#232323] transition-all animate-in slide-in-from-bottom-3 duration-200 ${box}`}
            >
              <Icon className={`w-5 h-5 ${iconColor} shrink-0 mt-0.5`} />
              <div className="flex-1 font-medium">{toast.message}</div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-stone-400 hover:text-stone-700 p-0.5 rounded transition-colors"
                aria-label="Close notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

// Hook for showing toasts; must be used inside <ToastProvider>.
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

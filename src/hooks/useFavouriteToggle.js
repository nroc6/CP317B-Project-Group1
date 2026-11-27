/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

// Returns a handler that saves/un-saves a market or vendor and shows a toast with the result.
export function useFavouriteToggle() {
  const { isAuthenticated, toggleFavourite } = useAuth();
  const { addToast } = useToast();

  return useCallback(
    async (target, targetType) => {
      if (!target) return;
      if (!isAuthenticated) {
        addToast(`Log in to save favourite ${targetType === 'vendor' ? 'stalls' : 'markets'}.`, 'info');
        return;
      }
      try {
        const saved = await toggleFavourite(target.id, targetType);
        addToast(saved ? `Added ${target.name} to favourites!` : `Removed ${target.name} from favourites`);
      } catch (err) {
        addToast(err.message || 'Could not update favourites.', 'error');
      }
    },
    [isAuthenticated, toggleFavourite, addToast]
  );
}

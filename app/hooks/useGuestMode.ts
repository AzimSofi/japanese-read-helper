'use client';

import { useEffect, useState } from 'react';
import { API_ROUTES } from '@/lib/constants';

interface GuestModeState {
  isGuest: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
}

/**
 * Reports whether the current visitor is signed in. Until the session check
 * resolves, isGuest stays false so guest-only UI never flashes for real users.
 */
export function useGuestMode(): GuestModeState {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const checkSession = async () => {
      try {
        const res = await fetch(API_ROUTES.AUTH_SESSION);
        const data = await res.json();
        if (active) setIsAuthenticated(Boolean(data.authenticated));
      } catch {
        if (active) setIsAuthenticated(false);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    checkSession();
    return () => {
      active = false;
    };
  }, []);

  return {
    isGuest: !isLoading && !isAuthenticated,
    isAuthenticated,
    isLoading,
  };
}

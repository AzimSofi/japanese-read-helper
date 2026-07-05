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
  const [isGuest, setIsGuest] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const checkSession = async () => {
      try {
        const res = await fetch(API_ROUTES.AUTH_SESSION);
        const data = await res.json();
        // Fail closed: only show guest UI when the server explicitly says so, so
        // a failed/non-JSON session check never degrades the signed-in owner's chrome.
        if (active) setIsGuest(data.authenticated === false);
      } catch {
        if (active) setIsGuest(false);
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
    isGuest,
    isAuthenticated: !isLoading && !isGuest,
    isLoading,
  };
}

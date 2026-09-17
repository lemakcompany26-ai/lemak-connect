import React, { createContext, useCallback, useContext, useState } from 'react';
import { base44 } from '@/api/base44Client';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [profile, setProfile] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [preferences, setPreferences] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const res = await base44.functions.invoke('getMyProfile', {});
    const d = res.data || res;
    setProfile(d.profile || null);
    setWallet(d.wallet || null);
    setPreferences(d.preferences || null);
    setLoading(false);
    return d;
  }, []);

  const setWalletLocal = useCallback((w) => {
    if (w) setWallet(prev => ({ ...(prev || {}), ...w }));
  }, []);

  return (
    <AppContext.Provider value={{ profile, wallet, preferences, loading, refresh, setWalletLocal, setProfile }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
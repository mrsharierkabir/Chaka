import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

const SiteContext = createContext(null);

const DEFAULT_SETTINGS = {
  hotline: '+8801521719188',
  whatsapp: '+8801521719188',
  cash_on_delivery_text: 'Cash on delivery',
  hours_text: '24 hours open',
  logo_text_1: 'SHOHAZ',
  logo_text_2: 'BAZAR',
  logo_icon_url: '',
  header_logo_url: '',
  footer_about: 'Top Quality Products, Electronics, Dried Fish and essentials - at your doorsteps.',
  footer_copyright: '@2026 shohazbazar- All Rights Reserved | Trade Licence: DEMO NUMBER XXXX XXXX XXXX XXXX XXXX',
};

export function SiteProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const refreshSettings = useCallback(async () => {
    const { data } = await supabase.from('settings').select('*').eq('id', 1).maybeSingle();
    if (data) setSettings(data);
  }, []);

  useEffect(() => {
    refreshSettings();
  }, [refreshSettings]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const isAdmin = !!session;

  return (
    <SiteContext.Provider value={{ settings, refreshSettings, session, isAdmin, authLoading }}>
      {children}
    </SiteContext.Provider>
  );
}

export function useSite() {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error('useSite must be used inside SiteProvider');
  return ctx;
}

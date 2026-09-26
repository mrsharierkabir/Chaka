import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const DISMISS_KEY = 'shohazbazar_popup_dismissed_date';

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 5l14 14M19 5L5 19" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export default function PopupBanner() {
  const [config, setConfig] = useState(null);
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.from('popup_banner').select('*').eq('id', 1).maybeSingle().then(({ data }) => setConfig(data));
  }, []);

  useEffect(() => {
    if (!config || !config.active || !config.image_url) return;

    if (config.remember_dismissal) {
      const dismissedDate = localStorage.getItem(DISMISS_KEY);
      const today = new Date().toDateString();
      if (dismissedDate === today) return;
    } else if (sessionStorage.getItem('shohazbazar_popup_dismissed_session')) {
      return;
    }

    const t = setTimeout(() => setVisible(true), Math.max(0, config.delay_seconds || 0) * 1000);
    return () => clearTimeout(t);
  }, [config]);

  function close() {
    setVisible(false);
    if (config.remember_dismissal) {
      localStorage.setItem(DISMISS_KEY, new Date().toDateString());
    } else {
      sessionStorage.setItem('shohazbazar_popup_dismissed_session', '1');
    }
  }

  function copyCode() {
    navigator.clipboard?.writeText(config.coupon_code || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  function goToOffer() {
    const link = config.offer_link || '/shop';
    close();
    if (link.startsWith('/')) navigate(link);
    else window.open(link, '_blank', 'noopener');
  }

  if (!visible || !config) return null;

  return (
    <div className="popup-banner-overlay" onClick={close}>
      <div className="popup-banner-card" onClick={(e) => e.stopPropagation()}>
        <div className="popup-banner-image-wrap">
          <img src={config.image_url} alt="" />
          <button className="popup-banner-close" aria-label="Close" onClick={close}><CloseIcon /></button>
        </div>
        <div className="popup-banner-body">
          {config.offer_mode === 'coupon' && config.coupon_code ? (
            <div className="popup-coupon-box">
              <span className="popup-coupon-code">{config.coupon_code}</span>
              <button className="btn btn-orange btn-sm" onClick={copyCode}>{copied ? 'Copied!' : 'Copy Code'}</button>
            </div>
          ) : (
            <button className="btn btn-teal btn-block" onClick={goToOffer}>{config.offer_link_label || 'Shop Now'}</button>
          )}
        </div>
      </div>
    </div>
  );
}

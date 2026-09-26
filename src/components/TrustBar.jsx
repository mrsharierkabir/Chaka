import { useNavigate } from 'react-router-dom';
import { useSite } from '../context/SiteContext';

function CartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M3 3h1.6l1.2 12.2A2 2 0 0 0 7.8 17h9.4a2 2 0 0 0 2-1.6L20.8 7H6"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      />
      <circle cx="9" cy="20.5" r="1.4" fill="currentColor" />
      <circle cx="17" cy="20.5" r="1.4" fill="currentColor" />
    </svg>
  );
}

export default function TrustBar() {
  const { settings } = useSite();
  const navigate = useNavigate();
  return (
    <div className="trust-strip">
      <div className="trust-left">
        <div className="trust-avatar">
          {settings.logo_icon_url ? <img src={settings.logo_icon_url} alt="" /> : <CartIcon />}
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="trust-text-title">
            <strong>{settings.logo_text_1} {settings.logo_text_2}.</strong> daily essentials
          </div>
          <div className="trust-text-sub">Fast. Trusted. Cash On Delivery</div>
        </div>
      </div>
      <button className="btn btn-teal" onClick={() => navigate('/shop')}>Shop Now →</button>
    </div>
  );
}

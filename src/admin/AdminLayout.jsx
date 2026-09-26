import { useState } from 'react';
import { NavLink, Navigate, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useSite } from '../context/SiteContext';
import { supabase } from '../lib/supabaseClient';

const NAV_ITEMS = [
  { to: '/admin/dashboard', label: '📊 Dashboard' },
  { to: '/admin/settings', label: '⚙️ Site Settings' },
  { to: '/admin/titles', label: '📢 Rotating Titles' },
  { to: '/admin/banners', label: '🖼️ Banners' },
  { to: '/admin/categories', label: '🗂️ Categories' },
  { to: '/admin/products', label: '📦 Products' },
  { to: '/admin/footer-links', label: '🔗 Footer Links' },
  { to: '/admin/policies', label: '📄 Policy Pages' },
  { to: '/admin/orders', label: '🧾 Orders' },
  { to: '/admin/incomplete-orders', label: '📋 Incomplete Orders' },
  { to: '/admin/coupons', label: '🏷️ Coupons' },
  { to: '/admin/delivery-charges', label: '🚚 Delivery Charges' },
];

export default function AdminLayout() {
  const { isAdmin, authLoading } = useSite();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (authLoading) return <div className="container" style={{ padding: 40 }}>Loading…</div>;
  if (!isAdmin) return <Navigate to="/admin/login" replace />;

  async function logout() {
    await supabase.auth.signOut();
    navigate('/admin/login');
  }

  const currentLabel = NAV_ITEMS.find((i) => location.pathname.startsWith(i.to))?.label?.replace(/^\S+\s/, '') || 'Admin';

  return (
    <div className="admin-shell">
      <div className="admin-mobile-topbar">
        <button className="hamburger-btn" aria-label="Menu" onClick={() => setSidebarOpen(true)}>☰</button>
        <span className="admin-mobile-title">{currentLabel}</span>
        <button className="icon-btn" onClick={() => navigate('/')} title="Back to store">🏬</button>
      </div>

      {sidebarOpen && <div className="admin-sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div className="brand">SHOHAZ<br />BAZAR<br /><small style={{ fontWeight: 400, fontSize: 12, opacity: .7 }}>Admin Panel</small></div>
          <button className="admin-sidebar-close" onClick={() => setSidebarOpen(false)}>✕</button>
        </div>
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? 'active' : '')} onClick={() => setSidebarOpen(false)}>
            {item.label}
          </NavLink>
        ))}
        <a onClick={logout} style={{ cursor: 'pointer', marginTop: 20, color: '#ffb1a6' }}>🚪 Logout</a>
        <a onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>← Back to Store</a>
      </aside>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}

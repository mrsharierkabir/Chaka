import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { formatPrice } from '../lib/helpers';
import DonutChart from './DonutChart';
import TrendChart from './TrendChart';

const STATUS_COLORS = {
  pending: '#d97e0f', shipped: '#2563eb', delivered: '#1a9d5c', returned: '#7c3aed', cancelled: '#e2483a',
};
const STATUS_LABELS = { pending: 'Pending', shipped: 'Shipped', delivered: 'Delivered', returned: 'Returned', cancelled: 'Cancelled' };

const KPI_PERIODS = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: 'Last 7 Days' },
  { key: '30d', label: 'Last 30 Days' },
  { key: 'all', label: 'All Time' },
];
const TREND_RANGES = [
  { key: '7d', label: '7 Days' },
  { key: '30d', label: '30 Days' },
  { key: '12m', label: '12 Months' },
];

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [counts, setCounts] = useState({ products: 0, categories: 0, orders: 0, banners: 0 });
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [kpiPeriod, setKpiPeriod] = useState('today');
  const [trendRange, setTrendRange] = useState('7d');
  const [unread, setUnread] = useState([]);
  const [showPopup, setShowPopup] = useState(false);

  async function loadCounts() {
    const [p, c, o, b] = await Promise.all([
      supabase.from('products').select('id', { count: 'exact', head: true }),
      supabase.from('categories').select('id', { count: 'exact', head: true }),
      supabase.from('orders').select('id', { count: 'exact', head: true }),
      supabase.from('banners').select('id', { count: 'exact', head: true }),
    ]);
    setCounts({ products: p.count || 0, categories: c.count || 0, orders: o.count || 0, banners: b.count || 0 });
  }

  async function loadOrders() {
    setLoading(true);
    // Pulling the columns the dashboard actually needs keeps this light even
    // with a large order history.
    const { data } = await supabase.from('orders').select('id,total,status,created_at').order('created_at', { ascending: true });
    setOrders(data || []);
    setLoading(false);
  }

  async function loadUnread() {
    const { data } = await supabase.from('orders').select('*').eq('is_read', false).order('created_at', { ascending: false });
    setUnread(data || []);
    if ((data || []).length > 0) setShowPopup(true);
  }

  useEffect(() => {
    loadCounts();
    loadOrders();
    loadUnread();

    const channel = supabase
      .channel('orders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        loadUnread();
        loadCounts();
        loadOrders();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  async function markAllRead() {
    const ids = unread.map((o) => o.id);
    if (ids.length === 0) { setShowPopup(false); return; }
    await supabase.from('orders').update({ is_read: true }).in('id', ids);
    setUnread([]);
    setShowPopup(false);
  }
  async function markOneRead(id) {
    await supabase.from('orders').update({ is_read: true }).eq('id', id);
    setUnread((prev) => prev.filter((o) => o.id !== id));
  }

  // ---------- KPI cards (respect the Today / 7d / 30d / All Time filter) ----------
  const kpis = useMemo(() => {
    const now = new Date();
    let cutoff = null;
    if (kpiPeriod === 'today') cutoff = startOfDay(now);
    else if (kpiPeriod === '7d') cutoff = new Date(now.getTime() - 7 * 86400000);
    else if (kpiPeriod === '30d') cutoff = new Date(now.getTime() - 30 * 86400000);

    const inRange = cutoff ? orders.filter((o) => new Date(o.created_at) >= cutoff) : orders;
    const counted = inRange.filter((o) => o.status !== 'cancelled');
    const sales = counted.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const avgOrder = counted.length > 0 ? sales / counted.length : 0;
    // Pending count is always "right now", regardless of the period filter,
    // since it's something that needs action today either way.
    const pending = orders.filter((o) => o.status === 'pending').length;

    return { sales, orderCount: inRange.length, avgOrder, pending };
  }, [orders, kpiPeriod]);

  // ---------- Sales trend chart ----------
  const trendPoints = useMemo(() => {
    const now = new Date();
    const nonCancelled = orders.filter((o) => o.status !== 'cancelled');

    if (trendRange === '12m') {
      const buckets = Array.from({ length: 12 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
        return { key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString('en-US', { month: 'short' }), value: 0 };
      });
      const map = Object.fromEntries(buckets.map((b) => [b.key, b]));
      nonCancelled.forEach((o) => {
        const d = new Date(o.created_at);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        if (map[key]) map[key].value += Number(o.total || 0);
      });
      return buckets;
    }

    const days = trendRange === '30d' ? 30 : 7;
    const buckets = Array.from({ length: days }, (_, i) => {
      const d = new Date(now.getTime() - (days - 1 - i) * 86400000);
      const key = startOfDay(d).toISOString().slice(0, 10);
      return { key, label: d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }), value: 0 };
    });
    const map = Object.fromEntries(buckets.map((b) => [b.key, b]));
    nonCancelled.forEach((o) => {
      const key = startOfDay(new Date(o.created_at)).toISOString().slice(0, 10);
      if (map[key]) map[key].value += Number(o.total || 0);
    });
    return buckets;
  }, [orders, trendRange]);

  // ---------- Order status distribution (all-time) ----------
  const statusSegments = useMemo(() => {
    const tally = { pending: 0, shipped: 0, delivered: 0, returned: 0, cancelled: 0 };
    orders.forEach((o) => { if (tally[o.status] !== undefined) tally[o.status] += 1; });
    return Object.entries(tally).map(([key, value]) => ({ label: STATUS_LABELS[key], value, color: STATUS_COLORS[key] }));
  }, [orders]);

  return (
    <div>
      <div className="dash-hero">
        <div>
          <h2>Welcome to Shohaz Bazar Admin</h2>
          <p>Manage settings, banners, categories, products, policy pages, and track live store performance.</p>
        </div>
        <div className="dash-mini-stats">
          <span className="dash-pill">📦 {counts.products} Products</span>
          <span className="dash-pill">📁 {counts.categories} Categories</span>
          <span className="dash-pill">🧾 {counts.orders} Orders</span>
          <span className="dash-pill">🖼️ {counts.banners} Banners</span>
        </div>
        {unread.length > 0 && (
          <button className="btn btn-orange btn-sm dash-notify-btn" onClick={() => setShowPopup(true)}>
            🔔 {unread.length} new order{unread.length !== 1 ? 's' : ''}
          </button>
        )}
      </div>

      <div className="dash-section-head">
        <div className="order-tabs" style={{ borderBottom: 'none', paddingBottom: 0 }}>
          {KPI_PERIODS.map((p) => (
            <button key={p.key} className={`order-tab ${kpiPeriod === p.key ? 'active' : ''}`} onClick={() => setKpiPeriod(p.key)}>{p.label}</button>
          ))}
        </div>
      </div>

      <div className="dash-kpi-grid">
        <div className="dash-kpi-card">
          <div className="dash-kpi-icon" style={{ background: '#e8f7f0', color: 'var(--teal)' }}>৳</div>
          <div>
            <div className="dash-kpi-label">Sales{kpiPeriod !== 'all' ? ` (${KPI_PERIODS.find((p) => p.key === kpiPeriod).label})` : ''}</div>
            <div className="dash-kpi-value">{loading ? '…' : formatPrice(kpis.sales)}</div>
          </div>
        </div>
        <div className="dash-kpi-card">
          <div className="dash-kpi-icon" style={{ background: '#eaf1ff', color: '#2563eb' }}>🧾</div>
          <div>
            <div className="dash-kpi-label">Orders{kpiPeriod !== 'all' ? ` (${KPI_PERIODS.find((p) => p.key === kpiPeriod).label})` : ''}</div>
            <div className="dash-kpi-value">{loading ? '…' : kpis.orderCount}</div>
          </div>
        </div>
        <div className="dash-kpi-card">
          <div className="dash-kpi-icon" style={{ background: '#fdf3e3', color: 'var(--orange-dark)' }}>📊</div>
          <div>
            <div className="dash-kpi-label">Avg. Order Value</div>
            <div className="dash-kpi-value">{loading ? '…' : formatPrice(kpis.avgOrder)}</div>
          </div>
        </div>
        <div className="dash-kpi-card dash-kpi-clickable" onClick={() => navigate('/admin/orders')}>
          <div className="dash-kpi-icon" style={{ background: '#fdeceb', color: 'var(--danger)' }}>⏳</div>
          <div>
            <div className="dash-kpi-label">Pending Orders</div>
            <div className="dash-kpi-value">{loading ? '…' : kpis.pending}</div>
            {kpis.pending > 0 && <div className="dash-kpi-sub">Needs action →</div>}
          </div>
        </div>
      </div>

      <div className="dash-charts-grid">
        <div className="admin-card dash-chart-card">
          <div className="dash-chart-head">
            <h4>Sales Trend</h4>
            <div className="order-tabs" style={{ borderBottom: 'none', paddingBottom: 0 }}>
              {TREND_RANGES.map((r) => (
                <button key={r.key} className={`order-tab order-tab-sm ${trendRange === r.key ? 'active' : ''}`} onClick={() => setTrendRange(r.key)}>{r.label}</button>
              ))}
            </div>
          </div>
          {loading ? <div className="trend-empty">Loading…</div> : <TrendChart points={trendPoints} />}
        </div>

        <div className="admin-card dash-chart-card">
          <h4 style={{ marginTop: 0 }}>Order Status Distribution</h4>
          {loading ? <div className="trend-empty">Loading…</div> : (
            <DonutChart segments={statusSegments} centerValue={counts.orders} centerLabel="Total Orders" />
          )}
        </div>
      </div>

      {showPopup && (
        <div className="cart-popup-overlay" onClick={() => setShowPopup(false)}>
          <div className="cart-popup" style={{ width: 440 }} onClick={(e) => e.stopPropagation()}>
            <div className="cart-popup-header">
              <span>🔔 New Order{unread.length !== 1 ? 's' : ''} ({unread.length})</span>
              <button className="icon-btn" onClick={() => setShowPopup(false)}>✕</button>
            </div>
            <div className="cart-popup-body">
              {unread.length === 0 && <div className="cart-popup-empty">You're all caught up 🎉</div>}
              {unread.map((o) => (
                <div className="cart-popup-row" key={o.id} style={{ alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700 }}>{o.customer_name || 'Customer'}</div>
                    <div style={{ fontSize: 12, color: '#888' }}>{o.customer_phone}</div>
                    <div style={{ fontSize: 12, color: '#888' }}>{(o.items || []).map((it) => `${it.name} x${it.qty}`).join(', ')}</div>
                    <div style={{ fontSize: 12, color: '#888' }}>{new Date(o.created_at).toLocaleString()}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                    <strong>{formatPrice(o.total)}</strong>
                    <button className="btn btn-sm btn-outline" onClick={() => markOneRead(o.id)}>Mark read</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="cart-popup-footer" style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-teal btn-block" onClick={() => { setShowPopup(false); navigate('/admin/orders'); }}>View All Orders</button>
              {unread.length > 0 && <button className="btn btn-outline btn-block" onClick={markAllRead}>Mark all as read</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

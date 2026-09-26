import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { formatPrice } from '../lib/helpers';

const TABS = [
  { key: 'pending', label: 'Pending' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'returned', label: 'Returned' },
  { key: 'cancelled', label: 'Cancelled' },
];

const STATUS_COLORS = {
  pending: '#d97e0f', shipped: '#2563eb', delivered: '#1a9d5c', returned: '#7c3aed', cancelled: '#e2483a',
};

export default function ManageOrders() {
  const [orders, setOrders] = useState([]);
  const [tab, setTab] = useState('pending');
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  async function load() {
    const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    setOrders(data || []);
  }
  useEffect(() => { load(); }, []);

  async function setStatus(id, status) {
    await supabase.from('orders').update({ status, is_read: true }).eq('id', id);
    load();
  }

  const counts = useMemo(() => {
    const c = { pending: 0, shipped: 0, delivered: 0, returned: 0, cancelled: 0 };
    orders.forEach((o) => { if (c[o.status] !== undefined) c[o.status] += 1; });
    return c;
  }, [orders]);

  const filtered = useMemo(() => {
    let list = orders.filter((o) => o.status === tab);
    if (dateFilter) {
      list = list.filter((o) => new Date(o.created_at).toISOString().slice(0, 10) === dateFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((o) =>
        o.invoice_no?.toLowerCase().includes(q) ||
        o.customer_name?.toLowerCase().includes(q) ||
        o.customer_phone?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [orders, tab, search, dateFilter]);

  return (
    <div>
      <div className="admin-header"><h2>Orders</h2></div>

      <div className="order-tabs">
        {TABS.map((t) => (
          <button key={t.key} className={`order-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label} <span className="order-tab-count">{counts[t.key]}</span>
          </button>
        ))}
      </div>

      <div className="shop-toolbar" style={{ marginTop: 14 }}>
        <input
          style={{ flex: 1, minWidth: 200 }}
          placeholder="Search by invoice, name, or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} style={{ padding: 9 }} />
        {dateFilter && <button className="btn btn-outline btn-sm" onClick={() => setDateFilter('')}>Clear date</button>}
      </div>

      <div className="admin-card">
        <div className="table-scroll">
            <table className="admin-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Invoice</th>
                <th>Status</th>
                <th>Customer</th>
                <th>Note</th>
                <th>Products</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id} style={{ background: o.is_read ? 'transparent' : '#fff8ec' }}>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {new Date(o.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    <br /><span style={{ color: '#999', fontSize: 11 }}>{new Date(o.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{o.invoice_no || '—'}</td>
                  <td>
                    <select value={o.status} onChange={(e) => setStatus(o.id, e.target.value)} style={{ color: STATUS_COLORS[o.status], fontWeight: 600, borderColor: STATUS_COLORS[o.status] }}>
                      {TABS.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                    </select>
                  </td>
                  <td>
                    {o.customer_name}<br />
                    <span style={{ color: '#999', fontSize: 12 }}>{o.customer_phone}</span><br />
                    <span style={{ color: '#999', fontSize: 12 }}>
                      {o.customer_address}
                      {(o.upazila || o.district || o.division) && <><br />{[o.upazila, o.district, o.division].filter(Boolean).join(', ')}</>}
                      {o.union_ward && <><br />{o.union_ward}</>}
                    </span>
                  </td>
                  <td style={{ maxWidth: 160, fontSize: 12.5, color: '#555' }}>{o.landmark || o.note || '—'}</td>
                  <td style={{ maxWidth: 200, fontSize: 12.5 }}>{(o.items || []).map((it) => `${it.name} x${it.qty}`).join(', ')}</td>
                  <td style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                    {formatPrice(o.total)}
                    <div style={{ fontWeight: 400, fontSize: 11, color: '#999' }}>
                      Sub {formatPrice(o.subtotal)} + Ship {formatPrice(o.delivery_charge || 0)}
                      {Number(o.discount_amount) > 0 && <> − {formatPrice(o.discount_amount)}</>}
                    </div>
                    {o.coupon_code && <span style={{ fontSize: 11, color: 'var(--teal-text)', fontWeight: 600 }}>🏷️ {o.coupon_code}</span>}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={7} style={{ color: '#999' }}>No {tab} orders{dateFilter ? ' on this date' : ''}{search ? ' matching your search' : ''}.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

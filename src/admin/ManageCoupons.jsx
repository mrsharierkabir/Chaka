import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { formatPrice } from '../lib/helpers';

const empty = {
  title: '', code: '', discount_type: 'percentage',
  discount_value: '', max_discount: '',
  min_order: '', usage_limit: '', per_customer_limit: 1,
  starts_at: '', expires_at: '',
};

function toLocalInputValue(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function randomCode(len = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function describeCoupon(c) {
  if (c.discount_type === 'percentage') {
    return `${c.discount_value}% Off${c.max_discount ? ` (Max ${formatPrice(c.max_discount)})` : ''}`;
  }
  if (c.discount_type === 'flat_tk') return `${formatPrice(c.discount_value)} Off`;
  return 'Delivery Fee = ৳0';
}

export default function ManageCoupons() {
  const [coupons, setCoupons] = useState([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    const { data } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
    setCoupons(data || []);
  }
  useEffect(() => { load(); }, []);

  function openNew() {
    setForm({ ...empty, starts_at: toLocalInputValue(new Date()) });
    setEditingId(null);
    setShowForm(true);
  }

  function openEdit(c) {
    setForm({
      title: c.title, code: c.code, discount_type: c.discount_type,
      discount_value: c.discount_value ?? '', max_discount: c.max_discount ?? '',
      min_order: c.min_order ?? '', usage_limit: c.usage_limit ?? '', per_customer_limit: c.per_customer_limit ?? 1,
      starts_at: c.starts_at ? toLocalInputValue(new Date(c.starts_at)) : '',
      expires_at: c.expires_at ? toLocalInputValue(new Date(c.expires_at)) : '',
    });
    setEditingId(c.id);
    setShowForm(true);
  }

  async function save(e) {
    e.preventDefault();
    if (!form.code.trim()) return;
    setSaving(true);
    const payload = {
      title: form.title || form.code,
      code: form.code.trim().toUpperCase(),
      discount_type: form.discount_type,
      discount_value: form.discount_type === 'free_shipping' ? 0 : Number(form.discount_value) || 0,
      max_discount: form.discount_type === 'percentage' && form.max_discount !== '' ? Number(form.max_discount) : null,
      min_order: Number(form.min_order) || 0,
      usage_limit: form.usage_limit !== '' ? Number(form.usage_limit) : null,
      per_customer_limit: Number(form.per_customer_limit) || 1,
      starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : new Date().toISOString(),
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
    };
    let error;
    if (editingId) {
      ({ error } = await supabase.from('coupons').update(payload).eq('id', editingId));
    } else {
      ({ error } = await supabase.from('coupons').insert(payload));
    }
    setSaving(false);
    if (error) { alert(error.message); return; }
    setShowForm(false);
    setForm(empty);
    setEditingId(null);
    load();
  }

  async function toggleActive(c) {
    await supabase.from('coupons').update({ active: !c.active }).eq('id', c.id);
    load();
  }

  async function remove(id) {
    if (!confirm('Delete this coupon? This cannot be undone.')) return;
    await supabase.from('coupons').delete().eq('id', id);
    load();
  }

  return (
    <div>
      <div className="admin-header">
        <h2>Coupons</h2>
        <button className="btn btn-teal" onClick={openNew}>+ Add Coupon</button>
      </div>

      {showForm && (
        <form className="admin-card" onSubmit={save}>
          <h4 style={{ marginTop: 0 }}>{editingId ? 'Edit Coupon' : 'Add Coupon'}</h4>

          <h5 className="admin-subhead">General Info</h5>
          <div className="admin-form-row">
            <label>Coupon Title</label>
            <input placeholder="e.g. Eid Special 15% Off" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="admin-form-row">
            <label>Coupon Code</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                required
                style={{ flex: 1 }}
                placeholder="e.g. EID15"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              />
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setForm({ ...form, code: randomCode() })}>🎲 Auto-Generate</button>
            </div>
          </div>

          <h5 className="admin-subhead">Discount Type & Value</h5>
          <div className="coupon-type-options">
            {[
              { key: 'percentage', label: 'Percentage Off' },
              { key: 'flat_tk', label: 'Flat Tk Off' },
              { key: 'free_shipping', label: 'Free Delivery' },
            ].map((t) => (
              <label key={t.key} className={`coupon-type-option ${form.discount_type === t.key ? 'active' : ''}`}>
                <input type="radio" name="discount_type" checked={form.discount_type === t.key} onChange={() => setForm({ ...form, discount_type: t.key })} />
                {t.label}
              </label>
            ))}
          </div>

          {form.discount_type === 'percentage' && (
            <div style={{ display: 'flex', gap: 14 }}>
              <div className="admin-form-row" style={{ flex: 1 }}>
                <label>Discount Value (%)</label>
                <input required type="number" min="1" max="100" placeholder="e.g. 15" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: e.target.value })} />
              </div>
              <div className="admin-form-row" style={{ flex: 1 }}>
                <label>Maximum Discount (optional)</label>
                <input type="number" placeholder="e.g. 300" value={form.max_discount} onChange={(e) => setForm({ ...form, max_discount: e.target.value })} />
              </div>
            </div>
          )}
          {form.discount_type === 'flat_tk' && (
            <div className="admin-form-row">
              <label>Discount Amount (৳)</label>
              <input required type="number" min="1" placeholder="e.g. 200" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: e.target.value })} />
            </div>
          )}
          {form.discount_type === 'free_shipping' && (
            <p style={{ fontSize: 13, color: '#666' }}>Delivery fee will be set to ৳0 at checkout when this code is applied.</p>
          )}

          <h5 className="admin-subhead">Usage Conditions</h5>
          <div className="admin-form-row">
            <label>Minimum Order Amount (৳)</label>
            <input type="number" min="0" placeholder="e.g. 1000" value={form.min_order} onChange={(e) => setForm({ ...form, min_order: e.target.value })} />
          </div>
          <div style={{ display: 'flex', gap: 14 }}>
            <div className="admin-form-row" style={{ flex: 1 }}>
              <label>Total Usage Limit (optional)</label>
              <input type="number" min="1" placeholder="Leave blank for unlimited" value={form.usage_limit} onChange={(e) => setForm({ ...form, usage_limit: e.target.value })} />
            </div>
            <div className="admin-form-row" style={{ flex: 1 }}>
              <label>Per Customer Limit</label>
              <input required type="number" min="1" value={form.per_customer_limit} onChange={(e) => setForm({ ...form, per_customer_limit: e.target.value })} />
            </div>
          </div>

          <h5 className="admin-subhead">Active Schedule</h5>
          <div style={{ display: 'flex', gap: 14 }}>
            <div className="admin-form-row" style={{ flex: 1 }}>
              <label>Start Date & Time</label>
              <input required type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
            </div>
            <div className="admin-form-row" style={{ flex: 1 }}>
              <label>Expiration Date & Time (optional)</label>
              <input type="datetime-local" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-teal" disabled={saving}>{saving ? 'Saving…' : editingId ? 'Update Coupon' : 'Create Coupon'}</button>
            <button type="button" className="btn btn-outline" onClick={() => { setShowForm(false); setForm(empty); setEditingId(null); }}>Cancel</button>
          </div>
        </form>
      )}

      <div className="admin-card">
        <div className="table-scroll">
          <table className="admin-table">
            <thead>
              <tr><th>Code</th><th>Type</th><th>Value / Details</th><th>Min Order</th><th>Usage</th><th>Expiration</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {coupons.map((c) => {
                const expired = c.expires_at && new Date(c.expires_at) < new Date();
                const exhausted = c.usage_limit != null && c.used_count >= c.usage_limit;
                const statusLabel = !c.active ? 'Disabled' : expired ? 'Expired' : exhausted ? 'Exhausted' : 'Active';
                const statusColor = statusLabel === 'Active' ? '#1a9d5c' : statusLabel === 'Disabled' ? '#999' : 'var(--danger)';
                return (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 700 }}>{c.code}</td>
                    <td style={{ textTransform: 'capitalize' }}>{c.discount_type.replace('_', ' ')}</td>
                    <td>{describeCoupon(c)}</td>
                    <td>{c.min_order > 0 ? formatPrice(c.min_order) : '—'}</td>
                    <td>{c.used_count} / {c.usage_limit ?? '∞'}</td>
                    <td>{c.expires_at ? new Date(c.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Never'}</td>
                    <td><span style={{ color: statusColor, fontWeight: 600 }}>🔘 {statusLabel}</span></td>
                    <td className="row-actions">
                      <button className="btn btn-sm btn-outline" onClick={() => openEdit(c)}>Edit</button>
                      <button className="btn btn-sm btn-outline" onClick={() => toggleActive(c)}>{c.active ? 'Disable' : 'Enable'}</button>
                      <button className="btn btn-sm btn-danger" onClick={() => remove(c.id)}>Delete</button>
                    </td>
                  </tr>
                );
              })}
              {coupons.length === 0 && <tr><td colSpan={8} style={{ color: '#999' }}>No coupons yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { uploadImage } from '../lib/helpers';

const empty = { image_url: '', headline: '', subheadline: '', link_url: '', active: true };

function PopupBannerSettings() {
  const [form, setForm] = useState(null);
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function load() {
    const { data } = await supabase.from('popup_banner').select('*').eq('id', 1).maybeSingle();
    setForm(data);
  }
  useEffect(() => { load(); }, []);

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    let image_url = form.image_url;
    if (file) image_url = await uploadImage(file, 'popup-banner');
    await supabase.from('popup_banner').update({ ...form, image_url }).eq('id', 1);
    setFile(null);
    setSaving(false);
    setSaved(true);
    load();
    setTimeout(() => setSaved(false), 2000);
  }

  if (!form) return null;

  return (
    <form className="admin-card" onSubmit={save} style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <h4 style={{ margin: 0 }}>Popup Banner</h4>
        <label className="switch-toggle">
          <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
          <span className="switch-track"><span className="switch-thumb" /></span>
          <span style={{ fontSize: 13, fontWeight: 600, color: form.active ? 'var(--teal-text)' : '#999' }}>{form.active ? 'ON' : 'OFF'}</span>
        </label>
      </div>
      <p style={{ color: '#666', fontSize: 13, marginTop: 0 }}>
        A promotional popup shown to visitors on the storefront after a short delay. A 4:3 image works
        best — it's shown at a comfortable size on both desktop and mobile, never covering the whole page.
      </p>

      <div className="admin-form-row">
        <label>Image (4:3 recommended)</label>
        <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} />
        {(file || form.image_url) && (
          <img
            src={file ? URL.createObjectURL(file) : form.image_url}
            style={{ width: 160, aspectRatio: '4/3', objectFit: 'cover', borderRadius: 12, marginTop: 8 }}
          />
        )}
      </div>

      <div className="admin-form-row">
        <label>Offer Type</label>
        <div className="coupon-type-options">
          <label className={`coupon-type-option ${form.offer_mode === 'coupon' ? 'active' : ''}`}>
            <input type="radio" name="offer_mode" checked={form.offer_mode === 'coupon'} onChange={() => setForm({ ...form, offer_mode: 'coupon' })} />
            Copyable coupon code
          </label>
          <label className={`coupon-type-option ${form.offer_mode === 'link' ? 'active' : ''}`}>
            <input type="radio" name="offer_mode" checked={form.offer_mode === 'link'} onChange={() => setForm({ ...form, offer_mode: 'link' })} />
            Button linking to a page
          </label>
        </div>
      </div>

      {form.offer_mode === 'coupon' ? (
        <div className="admin-form-row">
          <label>Coupon Code to Display</label>
          <input placeholder="e.g. EID15" value={form.coupon_code || ''} onChange={(e) => setForm({ ...form, coupon_code: e.target.value.toUpperCase() })} />
          <p style={{ fontSize: 12, color: '#999', margin: '4px 0 0' }}>
            Shown with a "Copy" button. Make sure a matching coupon also exists under Coupons if it should work at checkout.
          </p>
        </div>
      ) : (
        <div className="checkout-row-2">
          <div className="admin-form-row">
            <label>Link (e.g. /shop or /shop?category=...)</label>
            <input placeholder="/shop" value={form.offer_link || ''} onChange={(e) => setForm({ ...form, offer_link: e.target.value })} />
          </div>
          <div className="admin-form-row">
            <label>Button Text</label>
            <input placeholder="Shop Now" value={form.offer_link_label || ''} onChange={(e) => setForm({ ...form, offer_link_label: e.target.value })} />
          </div>
        </div>
      )}

      <div className="checkout-row-2">
        <div className="admin-form-row">
          <label>Show After (seconds)</label>
          <input type="number" min={0} value={form.delay_seconds} onChange={(e) => setForm({ ...form, delay_seconds: Number(e.target.value) })} />
        </div>
        <div className="admin-form-row" style={{ justifyContent: 'flex-end' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, marginTop: 20 }}>
            <input type="checkbox" checked={form.remember_dismissal} onChange={(e) => setForm({ ...form, remember_dismissal: e.target.checked })} />
            Don't show again today once closed
          </label>
        </div>
      </div>

      <button className="btn btn-teal" disabled={saving}>{saving ? 'Saving…' : 'Save Popup Settings'}</button>
      {saved && <span style={{ color: '#1a9d5c', marginLeft: 12, fontSize: 13 }}>✓ Saved</span>}
    </form>
  );
}

export default function ManageBanners() {
  const [banners, setBanners] = useState([]);
  const [form, setForm] = useState(empty);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState(null);

  async function load() {
    const { data } = await supabase.from('banners').select('*').order('position');
    setBanners(data || []);
  }
  useEffect(() => { load(); }, []);

  async function save(e) {
    e.preventDefault();
    setUploading(true);
    let image_url = form.image_url;
    if (file) image_url = await uploadImage(file, 'banners');
    if (editingId) {
      await supabase.from('banners').update({ ...form, image_url }).eq('id', editingId);
    } else {
      await supabase.from('banners').insert({ ...form, image_url, position: banners.length });
    }
    setForm(empty);
    setFile(null);
    setEditingId(null);
    setUploading(false);
    load();
  }

  function edit(b) {
    setForm({ image_url: b.image_url, headline: b.headline, subheadline: b.subheadline, link_url: b.link_url, active: b.active });
    setEditingId(b.id);
  }

  async function remove(id) {
    await supabase.from('banners').delete().eq('id', id);
    load();
  }

  async function move(index, dir) {
    const target = index + dir;
    if (target < 0 || target >= banners.length) return;
    const a = banners[index], b = banners[target];
    await supabase.from('banners').update({ position: b.position }).eq('id', a.id);
    await supabase.from('banners').update({ position: a.position }).eq('id', b.id);
    load();
  }

  return (
    <div>
      <div className="admin-header"><h2>Banners</h2></div>

      <PopupBannerSettings />

      <h4 style={{ margin: '0 0 4px' }}>Hero Carousel</h4>
      <p style={{ color: '#666', fontSize: 13 }}>The hero carousel auto-advances every 5 seconds; visitors can also click the left/right arrows.</p>

      <form className="admin-card" onSubmit={save}>
        <h4 style={{ marginTop: 0 }}>{editingId ? 'Edit Banner' : 'Add Banner'}</h4>
        <div className="admin-form-row">
          <label>Image</label>
          <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} />
          {form.image_url && <img src={form.image_url} style={{ width: 120, marginTop: 6, borderRadius: 6 }} />}
        </div>
        <div className="admin-form-row">
          <label>Headline (optional)</label>
          <input value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} />
        </div>
        <div className="admin-form-row">
          <label>Subheadline (optional)</label>
          <input value={form.subheadline} onChange={(e) => setForm({ ...form, subheadline: e.target.value })} />
        </div>
        <div className="admin-form-row">
          <label>Link URL (optional)</label>
          <input value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} />
        </div>
        <button className="btn btn-teal" disabled={uploading}>{uploading ? 'Saving…' : editingId ? 'Update Banner' : 'Add Banner'}</button>
        {editingId && <button type="button" className="btn btn-outline" style={{ marginLeft: 8 }} onClick={() => { setForm(empty); setFile(null); setEditingId(null); }}>Cancel</button>}
      </form>

      <div className="admin-card">
        <div className="table-scroll">
            <table className="admin-table">
            <thead><tr><th>Preview</th><th>Headline</th><th>Order</th><th></th></tr></thead>
            <tbody>
              {banners.map((b, i) => (
                <tr key={b.id}>
                  <td><img src={b.image_url} style={{ width: 80, height: 44, objectFit: 'cover', borderRadius: 6 }} /></td>
                  <td>{b.headline}</td>
                  <td>
                    <button className="btn-sm btn-outline" onClick={() => move(i, -1)}>↑</button>{' '}
                    <button className="btn-sm btn-outline" onClick={() => move(i, 1)}>↓</button>
                  </td>
                  <td className="row-actions">
                    <button className="btn btn-sm btn-outline" onClick={() => edit(b)}>Edit</button>
                    <button className="btn btn-sm btn-danger" onClick={() => remove(b.id)}>Delete</button>
                  </td>
                </tr>
              ))}
              {banners.length === 0 && <tr><td colSpan={4} style={{ color: '#999' }}>No banners yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

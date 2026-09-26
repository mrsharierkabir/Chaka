import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { formatPrice, whatsappLink } from '../lib/helpers';
import { getDivisions, getDistrictsByDivision, getUpazilasByDistrict } from '../lib/bdGeo';

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function CompleteOrderForm({ draft, onDone, onCancel }) {
  const divisions = useMemo(() => getDivisions(), []);
  const initialDivision = useMemo(() => divisions.find((d) => d.name === draft.division), [divisions, draft.division]);

  const [divisionId, setDivisionId] = useState(initialDivision?.id || '');
  const districts = useMemo(() => (divisionId ? getDistrictsByDivision(divisionId) : []), [divisionId]);
  const initialDistrict = useMemo(() => districts.find((d) => d.name === draft.district), [districts, draft.district]);
  const [districtId, setDistrictId] = useState('');
  useEffect(() => { if (initialDistrict) setDistrictId(initialDistrict.id); }, [initialDistrict]);

  const upazilas = useMemo(() => (districtId ? getUpazilasByDistrict(districtId) : []), [districtId]);
  const initialUpazila = useMemo(() => upazilas.find((u) => u.name === draft.upazila), [upazilas, draft.upazila]);
  const [upazilaId, setUpazilaId] = useState('');
  useEffect(() => { if (initialUpazila) setUpazilaId(initialUpazila.id); }, [initialUpazila]);

  const [unionWard, setUnionWard] = useState(draft.union_ward || '');
  const [street, setStreet] = useState(draft.street_address || '');
  const [landmark, setLandmark] = useState(draft.landmark || '');
  const [deliveryRates, setDeliveryRates] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('delivery_charges').select('*').then(({ data }) => setDeliveryRates(data || []));
  }, []);

  const selectedDivision = divisions.find((d) => d.id === divisionId);
  const selectedDistrict = districts.find((d) => d.id === districtId);
  const selectedUpazila = upazilas.find((u) => u.id === upazilaId);
  const deliveryRow = deliveryRates.find((r) => r.division_id === divisionId);
  const deliveryFee = deliveryRow ? (districtId === deliveryRow.city_district_id ? deliveryRow.inside_city_fee : deliveryRow.standard_fee) : 0;

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from('orders').insert({
      customer_name: draft.customer_name,
      customer_phone: draft.customer_phone,
      customer_address: street,
      street_address: street,
      landmark,
      division: selectedDivision?.name || '',
      district: selectedDistrict?.name || '',
      upazila: selectedUpazila?.name || '',
      union_ward: unionWard,
      items: draft.items,
      subtotal: draft.subtotal,
      delivery_charge: divisionId ? deliveryFee : 0,
      status: 'pending',
    });
    setSaving(false);
    if (error) { alert(error.message); return; }
    await supabase.from('incomplete_orders').delete().eq('id', draft.id);
    onDone();
  }

  return (
    <form className="admin-card" onSubmit={submit} style={{ marginTop: 10, background: '#fafffc' }}>
      <h5 className="admin-subhead" style={{ marginTop: 0 }}>Complete this order for {draft.customer_name || draft.customer_phone}</h5>
      <div className="checkout-row-2">
        <div className="admin-form-row">
          <label>Division</label>
          <select required value={divisionId} onChange={(e) => { setDivisionId(e.target.value); setDistrictId(''); setUpazilaId(''); }}>
            <option value="">Select Division</option>
            {divisions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div className="admin-form-row">
          <label>District</label>
          <select required disabled={!divisionId} value={districtId} onChange={(e) => { setDistrictId(e.target.value); setUpazilaId(''); }}>
            <option value="">Select District</option>
            {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      </div>
      <div className="checkout-row-2">
        <div className="admin-form-row">
          <label>Upazila / Thana</label>
          <select required disabled={!districtId} value={upazilaId} onChange={(e) => setUpazilaId(e.target.value)}>
            <option value="">Select Upazila</option>
            {upazilas.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <div className="admin-form-row">
          <label>Union / Ward</label>
          <input value={unionWard} onChange={(e) => setUnionWard(e.target.value)} />
        </div>
      </div>
      <div className="admin-form-row">
        <label>Street Address</label>
        <textarea required rows={2} value={street} onChange={(e) => setStreet(e.target.value)} />
      </div>
      <div className="admin-form-row">
        <label>Landmark / Delivery Note</label>
        <textarea rows={2} value={landmark} onChange={(e) => setLandmark(e.target.value)} />
      </div>
      <p style={{ fontSize: 12.5, color: '#666' }}>
        Delivery charge: {divisionId ? formatPrice(deliveryFee) : '—'} · Subtotal: {formatPrice(draft.subtotal)}
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-teal" disabled={saving}>{saving ? 'Creating…' : 'Create Order →'}</button>
        <button type="button" className="btn btn-outline" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

export default function ManageIncompleteOrders() {
  const [drafts, setDrafts] = useState([]);
  const [openId, setOpenId] = useState(null);

  async function load() {
    const { data } = await supabase.from('incomplete_orders').select('*').order('updated_at', { ascending: false });
    setDrafts(data || []);
  }
  useEffect(() => { load(); }, []);

  async function toggleContacted(d) {
    await supabase.from('incomplete_orders').update({ contacted: !d.contacted }).eq('id', d.id);
    load();
  }
  async function remove(id) {
    if (!confirm('Delete this incomplete checkout?')) return;
    await supabase.from('incomplete_orders').delete().eq('id', id);
    load();
  }

  const notContacted = drafts.filter((d) => !d.contacted).length;

  return (
    <div>
      <div className="admin-header"><h2>Incomplete Orders</h2></div>
      <p style={{ color: '#666', fontSize: 13.5, marginTop: -6 }}>
        Customers who started checkout but didn't finish — saved automatically once they've entered
        a name or phone with items in their cart. {drafts.length} total, {notContacted} not yet contacted.
      </p>

      {drafts.map((d) => (
        <div className="admin-card" key={d.id}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontWeight: 700 }}>{d.customer_name || <span style={{ color: '#999' }}>No name yet</span>}</div>
              <div style={{ fontSize: 13, color: '#555' }}>
                {d.customer_phone ? (
                  <>
                    📞 <a href={`tel:${d.customer_phone}`}>{d.customer_phone}</a>{' · '}
                    <a href={whatsappLink(d.customer_phone, "Hi! I noticed you didn't finish your order at Shohaz Bazar — want help completing it?")} target="_blank" rel="noreferrer">WhatsApp</a>
                  </>
                ) : <span style={{ color: '#999' }}>No phone yet</span>}
              </div>
              {(d.division || d.street_address) && (
                <div style={{ fontSize: 12.5, color: '#888', marginTop: 4 }}>
                  {[d.street_address, d.upazila, d.district, d.division].filter(Boolean).join(', ')}
                </div>
              )}
              <div style={{ fontSize: 12.5, color: '#888', marginTop: 4 }}>
                {(d.items || []).map((it) => `${it.name} x${it.qty}`).join(', ') || 'No items'} — {formatPrice(d.subtotal)}
              </div>
              <div style={{ fontSize: 11, color: '#bbb', marginTop: 4 }}>Last updated {timeAgo(d.updated_at)}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, cursor: 'pointer' }}>
                <input type="checkbox" checked={d.contacted} onChange={() => toggleContacted(d)} /> Contacted
              </label>
              <div className="row-actions">
                <button className="btn btn-sm btn-teal" onClick={() => setOpenId(openId === d.id ? null : d.id)}>
                  {openId === d.id ? 'Close' : 'Complete Order →'}
                </button>
                <button className="btn btn-sm btn-danger" onClick={() => remove(d.id)}>Delete</button>
              </div>
            </div>
          </div>
          {openId === d.id && (
            <CompleteOrderForm draft={d} onCancel={() => setOpenId(null)} onDone={() => { setOpenId(null); load(); }} />
          )}
        </div>
      ))}
      {drafts.length === 0 && <div className="admin-card" style={{ color: '#999' }}>No incomplete checkouts right now 🎉</div>}
    </div>
  );
}

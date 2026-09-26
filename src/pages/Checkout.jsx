import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDivisions, getDistrictsByDivision, getUpazilasByDistrict } from '../lib/bdGeo';
import { supabase } from '../lib/supabaseClient';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../lib/helpers';

const PHONE_REGEX = /^01\d{9}$/; // 01 followed by 9 more digits = 11 digits total
const DRAFT_ID_KEY = 'shohazbazar_draft_id';

export default function Checkout() {
  const { items, itemCount, subtotal, clearCart } = useCart();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '', phone: '',
    divisionId: '', districtId: '', upazilaId: '', unionWard: '',
    street: '', landmark: '',
  });
  const [phoneError, setPhoneError] = useState('');
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState(false);
  const [placedResult, setPlacedResult] = useState(null);

  const [deliveryRates, setDeliveryRates] = useState([]);
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [couponChecking, setCouponChecking] = useState(false);

  useEffect(() => {
    supabase.from('delivery_charges').select('*').order('position').then(({ data }) => setDeliveryRates(data || []));
  }, []);

  // ---------- Save an "incomplete order" draft a couple seconds after the
  // customer stops typing, once they've entered enough to be worth calling
  // (name or phone) and there's something in the cart — even if they never
  // click "Place Order". Lets the admin follow up manually.
  const draftIdRef = useRef(null);
  const draftTimeoutRef = useRef(null);
  useEffect(() => {
    if (!draftIdRef.current) {
      draftIdRef.current = localStorage.getItem(DRAFT_ID_KEY) || crypto.randomUUID();
      localStorage.setItem(DRAFT_ID_KEY, draftIdRef.current);
    }
  }, []);

  useEffect(() => {
    if (placed) return;
    const hasContactInfo = form.name.trim().length > 0 || form.phone.length >= 3;
    if (!hasContactInfo || items.length === 0) return;

    clearTimeout(draftTimeoutRef.current);
    draftTimeoutRef.current = setTimeout(() => {
      supabase.from('incomplete_orders').upsert({
        id: draftIdRef.current,
        customer_name: form.name,
        customer_phone: form.phone,
        division: selectedDivision?.name || '',
        district: selectedDistrict?.name || '',
        upazila: selectedUpazila?.name || '',
        union_ward: form.unionWard,
        street_address: form.street,
        landmark: form.landmark,
        items: items.map((it) => ({ product_id: it.id, variant_id: it.variantId || null, name: it.name, variantLabel: it.variantLabel, qty: it.qty, unitPrice: it.unitPrice })),
        subtotal,
      }, { onConflict: 'id' }).then(() => {});
    }, 1500);

    return () => clearTimeout(draftTimeoutRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.name, form.phone, form.divisionId, form.districtId, form.upazilaId, form.unionWard, form.street, form.landmark, items, subtotal, placed]);

  async function clearDraft() {
    if (!draftIdRef.current) return;
    await supabase.from('incomplete_orders').delete().eq('id', draftIdRef.current);
    localStorage.removeItem(DRAFT_ID_KEY);
  }

  const divisions = useMemo(() => getDivisions(), []);
  const districts = useMemo(() => (form.divisionId ? getDistrictsByDivision(form.divisionId) : []), [form.divisionId]);
  const upazilas = useMemo(() => (form.districtId ? getUpazilasByDistrict(form.districtId) : []), [form.districtId]);

  const selectedDivision = divisions.find((d) => d.id === form.divisionId);
  const selectedDistrict = districts.find((d) => d.id === form.districtId);
  const selectedUpazila = upazilas.find((u) => u.id === form.upazilaId);

  const deliveryRow = deliveryRates.find((r) => r.division_id === form.divisionId);
  const deliveryFee = deliveryRow
    ? (form.districtId && form.districtId === deliveryRow.city_district_id ? deliveryRow.inside_city_fee : deliveryRow.standard_fee)
    : 0;

  const discount = appliedCoupon ? (appliedCoupon.free_shipping ? deliveryFee : appliedCoupon.computed_discount) : 0;
  const total = Math.max(subtotal + (form.divisionId ? deliveryFee : 0) - discount, 0);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function onDivisionChange(id) {
    setForm((f) => ({ ...f, divisionId: id, districtId: '', upazilaId: '' }));
  }
  function onDistrictChange(id) {
    setForm((f) => ({ ...f, districtId: id, upazilaId: '' }));
  }

  function onPhoneChange(e) {
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 11);
    set('phone', digitsOnly);
    if (phoneError) setPhoneError('');
  }

  async function applyCoupon(e) {
    e.preventDefault();
    if (!couponInput.trim()) return;
    setCouponChecking(true);
    setCouponError('');
    const { data, error } = await supabase.rpc('check_coupon', {
      p_code: couponInput.trim(),
      p_subtotal: subtotal,
      p_phone: form.phone || '',
    });
    setCouponChecking(false);
    if (error || !data?.valid) {
      setCouponError(data?.message || error?.message || 'Could not apply this code');
      setAppliedCoupon(null);
      return;
    }
    setAppliedCoupon(data);
    setCouponInput('');
  }

  function removeCoupon() {
    setAppliedCoupon(null);
    setCouponError('');
  }

  if (items.length === 0 && !placed) {
    return (
      <div className="container">
        <div className="cart-page-box cart-empty">
          <h3>Your cart is empty</h3>
          <button className="btn btn-teal" onClick={() => navigate('/shop')}>Browse Shop →</button>
        </div>
      </div>
    );
  }

  if (placed) {
    return (
      <div className="container">
        <div className="cart-page-box cart-empty">
          <h3>🎉 Order placed successfully!</h3>
          {placedResult?.invoice_no && <p style={{ fontWeight: 600 }}>Your invoice number: {placedResult.invoice_no}</p>}
          {placedResult && Number(placedResult.discount_amount) > 0 && (
            <p style={{ color: '#1a9d5c', fontSize: 14 }}>🏷️ Discount applied: -{formatPrice(placedResult.discount_amount)}</p>
          )}
          {appliedCoupon && !placedResult?.coupon_code && (
            <p style={{ color: 'var(--danger)', fontSize: 13 }}>Note: your coupon couldn't be applied to this order (it may have just expired or reached its limit) — you were charged full price.</p>
          )}
          <p style={{ color: '#777' }}>We'll contact you shortly to confirm delivery.</p>
          <button className="btn btn-teal" onClick={() => navigate('/shop')}>Continue Shopping →</button>
        </div>
      </div>
    );
  }

  async function placeOrder(e) {
    e.preventDefault();
    if (!PHONE_REGEX.test(form.phone)) {
      setPhoneError('Enter a valid 11-digit number starting with 01 (e.g. 01712345678)');
      return;
    }
    setPlacing(true);
    const orderItems = items.map((it) => ({
      product_id: it.id,
      variant_id: it.variantId || null,
      name: it.name,
      variantLabel: it.variantLabel,
      qty: it.qty,
      unitPrice: it.unitPrice,
    }));
    const { data, error } = await supabase.from('orders').insert({
      customer_name: form.name,
      customer_phone: form.phone,
      customer_address: form.street,
      street_address: form.street,
      landmark: form.landmark,
      division: selectedDivision?.name || '',
      district: selectedDistrict?.name || '',
      upazila: selectedUpazila?.name || '',
      union_ward: form.unionWard,
      items: orderItems,
      subtotal,
      delivery_charge: form.divisionId ? deliveryFee : 0,
      coupon_code: appliedCoupon?.code || null,
      status: 'pending',
    }).select().single();
    setPlacing(false);
    if (error) { alert(error.message); return; }
    setPlaced(true);
    setPlacedResult(data);
    clearCart();
    clearDraft();
  }

  return (
    <div className="container">
      <div className="cart-page-box">
        <h2>Checkout</h2>
        <p style={{ color: '#777' }}>You have {itemCount} item{itemCount !== 1 ? 's' : ''} in your bag</p>
        <div className="cart-page-grid">
          <form className="admin-card" onSubmit={placeOrder}>
            <h5 className="admin-subhead">Contact Info</h5>
            <div className="checkout-row-2">
              <div className="admin-form-row">
                <label>Full Name</label>
                <input required value={form.name} onChange={(e) => set('name', e.target.value)} />
              </div>
              <div className="admin-form-row">
                <label>Phone Number</label>
                <input
                  required type="tel" inputMode="numeric" placeholder="01XXXXXXXXX" maxLength={11}
                  value={form.phone} onChange={onPhoneChange}
                  style={phoneError ? { borderColor: 'var(--danger)' } : undefined}
                />
                {phoneError && <span style={{ color: 'var(--danger)', fontSize: 12 }}>{phoneError}</span>}
              </div>
            </div>

            <h5 className="admin-subhead">Delivery Area</h5>
            <div className="checkout-row-2">
              <div className="admin-form-row">
                <label>Division</label>
                <select required value={form.divisionId} onChange={(e) => onDivisionChange(e.target.value)}>
                  <option value="">Select Division</option>
                  {divisions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="admin-form-row">
                <label>District</label>
                <select required disabled={!form.divisionId} value={form.districtId} onChange={(e) => onDistrictChange(e.target.value)}>
                  <option value="">{form.divisionId ? 'Select District' : 'Select division first'}</option>
                  {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            </div>
            <div className="checkout-row-2">
              <div className="admin-form-row">
                <label>Upazila / Thana</label>
                <select required disabled={!form.districtId} value={form.upazilaId} onChange={(e) => set('upazilaId', e.target.value)}>
                  <option value="">{form.districtId ? 'Select Upazila / Thana' : 'Select district first'}</option>
                  {upazilas.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div className="admin-form-row">
                <label>Union / Ward (optional)</label>
                <input placeholder="e.g. Ward 4" value={form.unionWard} onChange={(e) => set('unionWard', e.target.value)} />
              </div>
            </div>

            <h5 className="admin-subhead">Detailed Address</h5>
            <div className="admin-form-row">
              <label>Street Address / House No / Road No / Area</label>
              <textarea
                required rows={2} value={form.street} onChange={(e) => set('street', e.target.value)}
                placeholder="e.g. House 12, Road 4, Block B, Mirpur 10"
              />
            </div>
            <div className="admin-form-row">
              <label>Landmark / Delivery Note (optional)</label>
              <textarea
                rows={2} value={form.landmark} onChange={(e) => set('landmark', e.target.value)}
                placeholder="e.g. Near City Hospital / Opposite to the mosque"
              />
            </div>

            <button className="btn btn-teal btn-block" disabled={placing} style={{ marginTop: 6 }}>
              {placing ? 'Placing order…' : 'Place Order (Cash on Delivery)'}
            </button>
          </form>

          <div className="order-summary">
            <h4 style={{ marginTop: 0 }}>Order Summary</h4>

            <div className="order-summary-label">Items in Your Bag</div>
            <div className="summary-item-list">
              {items.map((it) => (
                <div className="summary-item-row" key={it.key}>
                  <img src={it.image} alt={it.name} />
                  <div className="summary-item-info">
                    <div className="summary-item-name">{it.name}</div>
                    {it.variantLabel && <div className="summary-item-variant">{it.variantLabel}</div>}
                    <div className="summary-item-qty">Qty: {it.qty} × {formatPrice(it.unitPrice)}</div>
                  </div>
                  <div className="summary-item-total">{formatPrice(it.qty * it.unitPrice)}</div>
                </div>
              ))}
            </div>

            <div className="order-summary-label">Cost Breakdown</div>
            <div className="order-summary-row"><span>Subtotal ({itemCount} item{itemCount !== 1 ? 's' : ''})</span><span>{formatPrice(subtotal)}</span></div>
            <div className="order-summary-row">
              <span>Delivery Charge{selectedDivision ? ` (${selectedDivision.name})` : ''}</span>
              <span>{form.divisionId ? formatPrice(deliveryFee) : '—'}</span>
            </div>
            {discount > 0 && (
              <div className="order-summary-row" style={{ color: '#1a9d5c' }}>
                <span>Discount{appliedCoupon ? ` (${appliedCoupon.code})` : ''}</span><span>-{formatPrice(discount)}</span>
              </div>
            )}

            <div className="coupon-box">
              {!appliedCoupon ? (
                <form className="coupon-apply-row" onSubmit={applyCoupon}>
                  <input
                    placeholder="Enter promo code (e.g. EID2026)"
                    value={couponInput}
                    onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError(''); }}
                  />
                  <button type="submit" className="btn btn-outline btn-sm" disabled={couponChecking}>{couponChecking ? '…' : 'Apply'}</button>
                </form>
              ) : (
                <div className="coupon-applied-badge">
                  <span>✓ Code "{appliedCoupon.code}" applied! ({appliedCoupon.message})</span>
                  <button type="button" onClick={removeCoupon}>Remove</button>
                </div>
              )}
              {couponError && <div className="coupon-error">{couponError}</div>}
            </div>

            <div className="order-summary-row order-summary-total"><span>Total Amount</span><span>{formatPrice(total)}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

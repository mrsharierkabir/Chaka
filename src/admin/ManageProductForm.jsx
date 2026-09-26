import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { uploadImage, slugify, discountPercent, cartesianAttributes, buildVariantSku, attributesEqual } from '../lib/helpers';
import RichTextEditor from '../components/RichTextEditor';

export default function ManageProductForm() {
  const { id } = useParams();
  const isNew = id === 'new';
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    name: '', sku: '', product_type: 'simple', category_id: '',
    regular_price: '', discounted_price: '', stock: '',
    description: '', delivery_info: '', featured: false, images: [],
  });
  const [newImageFiles, setNewImageFiles] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [saving, setSaving] = useState(false);
  const [savedProductId, setSavedProductId] = useState(isNew ? null : id);

  // Variable-product state
  const [attributes, setAttributes] = useState([]); // [{id?, name, values: []}]
  const [variants, setVariants] = useState([]); // saved rows from DB
  const [attrDraft, setAttrDraft] = useState({ name: '', valuesText: '' });

  useEffect(() => {
    supabase.from('categories').select('*').order('position').then(({ data }) => setCategories(data || []));
    if (!isNew) {
      supabase.from('products').select('*').eq('id', id).maybeSingle().then(({ data }) => {
        if (data) setForm(data);
      });
      loadAttributes(id);
      loadVariants(id);
      supabase.from('product_reviews').select('*').eq('product_id', id).order('created_at', { ascending: false }).then(({ data }) => setReviews(data || []));
      setSavedProductId(id);
    }
  }, [id]);

  async function loadAttributes(pid) {
    const { data } = await supabase.from('product_attributes').select('*').eq('product_id', pid).order('position');
    setAttributes((data || []).map((a) => ({ id: a.id, name: a.name, values: a.values || [] })));
  }
  async function loadVariants(pid) {
    const { data } = await supabase.from('product_variants').select('*').eq('product_id', pid).order('position');
    setVariants(data || []);
  }

  function set(key, value) { setForm((f) => ({ ...f, [key]: value })); }

  async function removeExistingImage(url) {
    set('images', form.images.filter((i) => i !== url));
  }

  async function saveProduct(e) {
    e.preventDefault();
    setSaving(true);
    const uploaded = [];
    for (const file of newImageFiles) {
      uploaded.push(await uploadImage(file, 'products'));
    }
    const images = [...(form.images || []), ...uploaded];
    const payload = {
      name: form.name,
      slug: form.slug || slugify(form.name),
      sku: form.sku || null, // null lets the DB trigger auto-generate one
      product_type: form.product_type,
      category_id: form.category_id || null,
      regular_price: Number(form.regular_price) || 0,
      discounted_price: Number(form.discounted_price) || 0,
      stock: Number(form.stock) || 0,
      description: form.description,
      delivery_info: form.delivery_info,
      featured: form.featured,
      images,
    };

    let productId = id;
    if (isNew) {
      const { data, error } = await supabase.from('products').insert(payload).select().single();
      if (error) { alert(error.message); setSaving(false); return; }
      productId = data.id;
      setForm(data);
    } else {
      const { data, error } = await supabase.from('products').update(payload).eq('id', id).select().single();
      if (error) { alert(error.message); setSaving(false); return; }
      setForm(data);
    }
    setNewImageFiles([]);
    setSaving(false);
    setSavedProductId(productId);
    if (isNew) navigate(`/admin/products/${productId}`, { replace: true });
  }

  // --- Attributes Manager ---
  function addAttribute(e) {
    e.preventDefault();
    if (!attrDraft.name.trim() || !attrDraft.valuesText.trim()) return;
    const values = attrDraft.valuesText.split(',').map((v) => v.trim()).filter(Boolean);
    setAttributes((prev) => [...prev, { name: attrDraft.name.trim(), values }]);
    setAttrDraft({ name: '', valuesText: '' });
  }
  function removeAttribute(index) {
    setAttributes((prev) => prev.filter((_, i) => i !== index));
  }

  async function saveAttributesAndGenerate() {
    if (!savedProductId) { alert('Save the product first.'); return; }
    // Replace all attribute rows for this product with the current list.
    await supabase.from('product_attributes').delete().eq('product_id', savedProductId);
    if (attributes.length) {
      await supabase.from('product_attributes').insert(
        attributes.map((a, i) => ({ product_id: savedProductId, name: a.name, values: a.values, position: i }))
      );
    }
    await loadAttributes(savedProductId);

    // Generate any missing variant combinations (skip ones that already exist).
    const combos = cartesianAttributes(attributes);
    const existing = variants;
    const toCreate = combos.filter((combo) => !existing.some((v) => attributesEqual(v.attributes, combo)));
    if (toCreate.length) {
      const rows = toCreate.map((combo, i) => ({
        product_id: savedProductId,
        sku: buildVariantSku(form.sku, combo),
        attributes: combo,
        regular_price: Number(form.regular_price) || 0,
        discounted_price: null,
        stock: 0,
        image_url: '',
        position: existing.length + i,
      }));
      const { error } = await supabase.from('product_variants').insert(rows);
      if (error) { alert(error.message); return; }
    }
    await loadVariants(savedProductId);
  }

  async function updateVariantField(vid, field, value) {
    setVariants((prev) => prev.map((v) => (v.id === vid ? { ...v, [field]: value } : v)));
  }
  async function saveVariantRow(v) {
    await supabase.from('product_variants').update({
      sku: v.sku,
      regular_price: Number(v.regular_price) || 0,
      discounted_price: v.discounted_price === '' || v.discounted_price == null ? null : Number(v.discounted_price),
      stock: Number(v.stock) || 0,
    }).eq('id', v.id);
    await loadVariants(savedProductId);
  }
  async function uploadVariantImage(v, file) {
    const url = await uploadImage(file, 'variants');
    await supabase.from('product_variants').update({ image_url: url }).eq('id', v.id);
    await loadVariants(savedProductId);
  }
  async function deleteVariant(vid) {
    if (!confirm('Delete this variant?')) return;
    await supabase.from('product_variants').delete().eq('id', vid);
    setVariants((prev) => prev.filter((v) => v.id !== vid));
  }

  // --- Reviews ---
  const [reviewDraft, setReviewDraft] = useState({ author: '', rating: 5, comment: '' });
  async function addReview(e) {
    e.preventDefault();
    if (isNew) { alert('Save the product first, then add reviews.'); return; }
    await supabase.from('product_reviews').insert({ product_id: savedProductId, ...reviewDraft });
    setReviewDraft({ author: '', rating: 5, comment: '' });
    const { data } = await supabase.from('product_reviews').select('*').eq('product_id', savedProductId).order('created_at', { ascending: false });
    setReviews(data || []);
  }
  async function removeReview(rid) {
    await supabase.from('product_reviews').delete().eq('id', rid);
    setReviews((r) => r.filter((x) => x.id !== rid));
  }

  const off = discountPercent(form.regular_price, form.discounted_price);
  const isVariable = form.product_type === 'variable';

  return (
    <div>
      <div className="admin-header"><h2>{isNew ? 'Add Product' : `Edit: ${form.name}`}</h2></div>

      <form className="admin-card" onSubmit={saveProduct}>
        <div className="product-type-toggle">
          <button type="button" className={!isVariable ? 'active' : ''} onClick={() => set('product_type', 'simple')}>
            Simple Product
            <small>One price, one stock count — most products.</small>
          </button>
          <button type="button" className={isVariable ? 'active' : ''} onClick={() => set('product_type', 'variable')}>
            Variable Product
            <small>Has options like Size or Color, each with its own price/stock/SKU.</small>
          </button>
        </div>

        <div className="admin-form-row">
          <label>Product Name</label>
          <input required value={form.name} onChange={(e) => set('name', e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 14 }}>
          <div className="admin-form-row" style={{ flex: 1 }}>
            <label>Category</label>
            <select value={form.category_id || ''} onChange={(e) => set('category_id', e.target.value)}>
              <option value="">— none —</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="admin-form-row" style={{ flex: 1 }}>
            <label>{isVariable ? 'Parent SKU' : 'SKU'} (leave blank to auto-generate)</label>
            <input placeholder="e.g. TSH-00102" value={form.sku || ''} onChange={(e) => set('sku', e.target.value)} />
          </div>
        </div>
        {form.sku && <p className="sku-hint">Current SKU: <strong>{form.sku}</strong></p>}

        <div className="admin-form-row">
          <label>Description</label>
          <RichTextEditor key={id} value={form.description} onChange={(html) => set('description', html)} />
        </div>

        {!isVariable && (
          <div style={{ display: 'flex', gap: 14 }}>
            <div className="admin-form-row" style={{ flex: 1 }}>
              <label>Regular Price (৳)</label>
              <input type="number" required value={form.regular_price} onChange={(e) => set('regular_price', e.target.value)} />
            </div>
            <div className="admin-form-row" style={{ flex: 1 }}>
              <label>Discounted Price (৳)</label>
              <input type="number" value={form.discounted_price} onChange={(e) => set('discounted_price', e.target.value)} />
            </div>
            <div className="admin-form-row" style={{ flex: 1 }}>
              <label>Stock Quantity</label>
              <input type="number" required value={form.stock} onChange={(e) => set('stock', e.target.value)} />
            </div>
          </div>
        )}
        {!isVariable && off > 0 && <p style={{ color: '#1a9d5c', fontSize: 13 }}>Auto-calculated discount: {off}% off</p>}
        {isVariable && (
          <p style={{ color: '#666', fontSize: 13, background: '#f7f7f7', padding: 10, borderRadius: 8 }}>
            Price and stock for variable products are set per-option below, in the Attributes &amp; Variants section
            (once you've saved the product).
          </p>
        )}

        <div className="admin-form-row">
          <label>Product Images (first = main image, rest = gallery)</label>
          <div className="thumb-row" style={{ marginBottom: 8 }}>
            {(form.images || []).map((img) => (
              <div key={img} style={{ position: 'relative' }}>
                <img src={img} />
                <button type="button" onClick={() => removeExistingImage(img)} style={{ position: 'absolute', top: -6, right: -6, background: '#e2483a', color: '#fff', border: 'none', borderRadius: '50%', width: 18, height: 18, fontSize: 10 }}>✕</button>
              </div>
            ))}
          </div>
          <input type="file" accept="image/*" multiple onChange={(e) => setNewImageFiles(Array.from(e.target.files))} />
          <p style={{ fontSize: 12, color: '#999', margin: '4px 0 0' }}>
            {isVariable ? 'Shown when no option is selected yet. Each variant can also have its own image below.' : ''}
          </p>
        </div>

        <div className="admin-form-row">
          <label>Featured Pick (boosted to the top of the home page)</label>
          <input type="checkbox" checked={form.featured} onChange={(e) => set('featured', e.target.checked)} style={{ width: 18 }} />
        </div>

        <div className="admin-form-row">
          <label>Delivery Info</label>
          <textarea rows={3} value={form.delivery_info} onChange={(e) => set('delivery_info', e.target.value)} />
        </div>

        <button className="btn btn-teal" disabled={saving}>{saving ? 'Saving…' : isNew ? 'Create Product' : 'Save Changes'}</button>
      </form>

      {isVariable && savedProductId && (
        <div className="admin-card">
          <h4 style={{ marginTop: 0 }}>Attributes Manager</h4>
          <p style={{ color: '#666', fontSize: 13 }}>
            Add each option type (e.g. "Size") with its comma-separated values (e.g. "S, M, L"), then click
            "Save & Generate Variants" to create one row per combination below.
          </p>
          <form onSubmit={addAttribute} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            <input placeholder="Attribute name (e.g. Size)" value={attrDraft.name} onChange={(e) => setAttrDraft({ ...attrDraft, name: e.target.value })} style={{ padding: 8, border: '1px solid var(--border)', borderRadius: 8, flex: 1, minWidth: 140 }} />
            <input placeholder="Values, comma separated (e.g. S, M, L)" value={attrDraft.valuesText} onChange={(e) => setAttrDraft({ ...attrDraft, valuesText: e.target.value })} style={{ padding: 8, border: '1px solid var(--border)', borderRadius: 8, flex: 2, minWidth: 200 }} />
            <button className="btn btn-outline btn-sm">Add Attribute</button>
          </form>
          {attributes.map((a, i) => (
            <div key={i} style={{ marginBottom: 8 }}>
              <strong style={{ fontSize: 13 }}>{a.name}:</strong>
              <div className="attr-chip-list" style={{ display: 'inline-flex', marginLeft: 8 }}>
                {a.values.map((v) => <span className="attr-chip" key={v}>{v}</span>)}
              </div>
              <button type="button" className="btn btn-sm" style={{ background: 'none', color: 'var(--danger)', marginLeft: 8 }} onClick={() => removeAttribute(i)}>Remove</button>
            </div>
          ))}
          <button className="btn btn-teal" style={{ marginTop: 8 }} onClick={saveAttributesAndGenerate}>Save &amp; Generate Variants</button>
        </div>
      )}

      {isVariable && savedProductId && (
        <div className="admin-card">
          <h4 style={{ marginTop: 0 }}>Variants ({variants.length})</h4>
          {variants.length === 0 && <p style={{ color: '#999' }}>No variants yet — add attributes above and generate them.</p>}
          {variants.length > 0 && (
            <div className="table-scroll">
              <table className="admin-table">
                <thead>
                  <tr><th>Options</th><th>SKU</th><th>Regular ৳</th><th>Discounted ৳</th><th>Stock</th><th>Image</th><th></th></tr>
                </thead>
                <tbody>
                  {variants.map((v) => (
                    <tr key={v.id} className="variant-edit-row">
                      <td>{Object.entries(v.attributes || {}).map(([k, val]) => `${k}: ${val}`).join(', ')}</td>
                      <td><input value={v.sku || ''} onChange={(e) => updateVariantField(v.id, 'sku', e.target.value)} onBlur={() => saveVariantRow(v)} /></td>
                      <td><input type="number" value={v.regular_price ?? ''} onChange={(e) => updateVariantField(v.id, 'regular_price', e.target.value)} onBlur={() => saveVariantRow(v)} /></td>
                      <td><input type="number" value={v.discounted_price ?? ''} onChange={(e) => updateVariantField(v.id, 'discounted_price', e.target.value)} onBlur={() => saveVariantRow(v)} /></td>
                      <td><input type="number" value={v.stock ?? ''} onChange={(e) => updateVariantField(v.id, 'stock', e.target.value)} onBlur={() => saveVariantRow(v)} /></td>
                      <td>
                        {v.image_url ? <img src={v.image_url} /> : '—'}
                        <input type="file" accept="image/*" style={{ width: 90, fontSize: 10 }} onChange={(e) => e.target.files[0] && uploadVariantImage(v, e.target.files[0])} />
                      </td>
                      <td><button className="btn btn-sm btn-danger" onClick={() => deleteVariant(v.id)}>Delete</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {!isNew && (
        <div className="admin-card">
          <h4 style={{ marginTop: 0 }}>Reviews</h4>
          <form onSubmit={addReview} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            <input placeholder="Author" value={reviewDraft.author} onChange={(e) => setReviewDraft({ ...reviewDraft, author: e.target.value })} style={{ padding: 8, border: '1px solid var(--border)', borderRadius: 8 }} />
            <select value={reviewDraft.rating} onChange={(e) => setReviewDraft({ ...reviewDraft, rating: Number(e.target.value) })}>
              {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} ★</option>)}
            </select>
            <input placeholder="Comment" required value={reviewDraft.comment} onChange={(e) => setReviewDraft({ ...reviewDraft, comment: e.target.value })} style={{ padding: 8, border: '1px solid var(--border)', borderRadius: 8, flex: 1, minWidth: 200 }} />
            <button className="btn btn-teal btn-sm">Add Review</button>
          </form>
          <div className="table-scroll">
            <table className="admin-table">
              <tbody>
                {reviews.map((r) => (
                  <tr key={r.id}>
                    <td>{r.author}</td>
                    <td>{'★'.repeat(r.rating)}</td>
                    <td>{r.comment}</td>
                    <td><button className="btn btn-sm btn-danger" onClick={() => removeReview(r.id)}>Delete</button></td>
                  </tr>
                ))}
                {reviews.length === 0 && <tr><td colSpan={4} style={{ color: '#999' }}>No reviews yet</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

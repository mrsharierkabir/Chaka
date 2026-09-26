import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { formatPrice, discountPercent } from '../lib/helpers';

export default function ManageProducts() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  async function load() {
    const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    setProducts(data || []);
  }
  useEffect(() => { load(); }, []);

  async function remove(id) {
    if (!confirm('Delete this product? This also deletes its variants and reviews.')) return;
    await supabase.from('products').delete().eq('id', id);
    load();
  }

  const q = search.toLowerCase();
  const filtered = products.filter((p) => p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q));

  return (
    <div>
      <div className="admin-header">
        <h2>Products</h2>
        <button className="btn btn-teal" onClick={() => navigate('/admin/products/new')}>+ Add Product</button>
      </div>
      <input
        placeholder="Search by name or SKU…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ padding: 9, border: '1px solid var(--border)', borderRadius: 12, marginBottom: 14, width: 280 }}
      />
      <div className="admin-card">
        <div className="table-scroll">
          <table className="admin-table">
            <thead><tr><th>Image</th><th>Name</th><th>SKU</th><th>Type</th><th>Price</th><th>Off</th><th>Stock</th><th>Featured</th><th></th></tr></thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td><img src={p.images?.[0]} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 8 }} /></td>
                  <td>{p.name}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{p.sku || '—'}</td>
                  <td>{p.product_type === 'variable' ? 'Variable' : 'Simple'}</td>
                  <td>{p.product_type === 'variable' ? 'From ' : ''}{formatPrice(p.discounted_price || p.regular_price)}</td>
                  <td>{discountPercent(p.regular_price, p.discounted_price)}%</td>
                  <td>{p.stock}</td>
                  <td>{p.featured ? '⭐' : ''}</td>
                  <td className="row-actions">
                    <button className="btn btn-sm btn-outline" onClick={() => navigate(`/admin/products/${p.id}`)}>Edit</button>
                    <button className="btn btn-sm btn-danger" onClick={() => remove(p.id)}>Delete</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={9} style={{ color: '#999' }}>No products found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

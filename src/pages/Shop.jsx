import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { discountPercent } from '../lib/helpers';
import ProductCard from '../components/ProductCard';

const PAGE_SIZE = 15;

export default function Shop() {
  const [params, setParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState(params.get('q') || '');
  const [categoryId, setCategoryId] = useState(params.get('category') || '');
  const [sort, setSort] = useState('newest');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [maxRange, setMaxRange] = useState(250000);
  const [priceMax, setPriceMax] = useState(250000);
  const [page, setPage] = useState(1);

  useEffect(() => {
    supabase.from('categories').select('*').eq('active', true).order('position').then(({ data }) => setCategories(data || []));
    supabase.from('products').select('*').then(({ data }) => {
      setProducts(data || []);
      const highest = Math.max(250000, ...(data || []).map((p) => p.regular_price || 0));
      setMaxRange(highest);
      setPriceMax(highest);
    });
  }, []);

  // Keep this page's search/category state in sync with the URL — this is what
  // makes the header search bar work even when you're already on the Shop page.
  useEffect(() => {
    setSearch(params.get('q') || '');
    setCategoryId(params.get('category') || '');
    setPage(1);
  }, [params]);

  const catMap = Object.fromEntries(categories.map((c) => [c.id, c.name]));

  const filtered = useMemo(() => {
    let list = [...products];
    if (search) list = list.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
    if (categoryId) list = list.filter((p) => p.category_id === categoryId);
    if (inStockOnly) list = list.filter((p) => p.stock > 0);
    list = list.filter((p) => (p.discounted_price || p.regular_price) <= priceMax);

    switch (sort) {
      case 'price_low':
        list.sort((a, b) => (a.discounted_price || a.regular_price) - (b.discounted_price || b.regular_price));
        break;
      case 'price_high':
        list.sort((a, b) => (b.discounted_price || b.regular_price) - (a.discounted_price || a.regular_price));
        break;
      case 'best_discount':
        list.sort((a, b) => discountPercent(b.regular_price, b.discounted_price) - discountPercent(a.regular_price, a.discounted_price));
        break;
      default:
        list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    return list;
  }, [products, search, categoryId, inStockOnly, priceMax, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function resetFilters() {
    setPriceMax(maxRange);
  }

  return (
    <div className="container">
      <div className="section">
        <h2>All Products</h2>
        <p style={{ color: '#777', fontSize: 14 }}>Pure honey, authentic carbs Back on fish, oil and electronics items</p>

        <form
          className="shop-toolbar"
          onSubmit={(e) => { e.preventDefault(); setParams((p) => { const n = new URLSearchParams(p); if (search) n.set('q', search); else n.delete('q'); return n; }); }}
        >
          <input
            style={{ flex: 1, minWidth: 200 }}
            placeholder="Search item"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
          <button type="submit" className="btn btn-orange">Search</button>
          <select value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setPage(1); }}>
            <option value="">All category</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="newest">Featured / Newest</option>
            <option value="price_low">Price: Low to High</option>
            <option value="price_high">Price: High to Low</option>
            <option value="best_discount">Best Discount</option>
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <input type="checkbox" checked={inStockOnly} onChange={(e) => setInStockOnly(e.target.checked)} />
            In stock
          </label>
        </form>

        <div className="price-range-box">
          <div className="price-range-head">
            <span>Price range</span>
            <span>৳150 - ৳{priceMax.toLocaleString()}</span>
          </div>
          <input
            type="range"
            className="price-range"
            min={150}
            max={maxRange}
            value={priceMax}
            onChange={(e) => setPriceMax(Number(e.target.value))}
            style={{ '--fill': `${((priceMax - 150) / (maxRange - 150 || 1)) * 100}%` }}
          />
          <div className="price-range-actions">
            <button className="btn btn-outline btn-sm" onClick={resetFilters}>Reset</button>
            <button className="btn btn-teal btn-sm" onClick={() => setPage(1)}>Apply</button>
          </div>
        </div>

        <div className="chip-scroll">
          {categories.map((c) => (
            <div
              key={c.id}
              className={`category-tile ${categoryId === c.id ? 'active' : ''}`}
              onClick={() => setCategoryId(categoryId === c.id ? '' : c.id)}
            >
              <div className="circle">{c.icon_url ? <img src={c.icon_url} alt={c.name} /> : '🛍️'}</div>
              <div>{c.name}</div>
            </div>
          ))}
        </div>

        <div className="product-grid">
          {pageItems.map((p) => (
            <ProductCard key={p.id} product={p} categoryName={catMap[p.category_id]} />
          ))}
          {pageItems.length === 0 && <div style={{ color: '#999' }}>No products match your filters</div>}
        </div>

        {totalPages > 1 && (
          <div className="pagination">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button key={n} className={n === page ? 'active' : ''} onClick={() => setPage(n)}>{n}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

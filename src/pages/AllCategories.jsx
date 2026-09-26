import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function AllCategories() {
  const [categories, setCategories] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.from('categories').select('*').eq('active', true).order('position').then(({ data }) => setCategories(data || []));
  }, []);

  return (
    <div className="container" style={{ paddingTop: 20, paddingBottom: 40 }}>
      <h2 style={{ marginBottom: 4 }}>All Categories</h2>
      <p style={{ color: 'var(--muted)', marginTop: 0, marginBottom: 20 }}>Browse our complete list of fresh groceries and daily essentials.</p>
      <div className="all-categories-grid">
        {categories.map((c) => (
          <div key={c.id} className="all-categories-tile" onClick={() => navigate(`/shop?category=${c.id}`)}>
            <div className="all-categories-photo">
              {c.icon_url ? <img src={c.icon_url} alt={c.name} /> : '🛍️'}
            </div>
            <div className="all-categories-name">{c.name}</div>
          </div>
        ))}
        {categories.length === 0 && <div style={{ color: '#999' }}>No categories yet</div>}
      </div>
    </div>
  );
}

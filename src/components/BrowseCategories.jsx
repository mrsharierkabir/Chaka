import { useNavigate } from 'react-router-dom';

export default function BrowseCategories({ categories, limit = 9 }) {
  const navigate = useNavigate();
  const shown = limit ? categories.slice(0, limit) : categories;

  return (
    <div className="section">
      <div className="section-head">
        <h3>Browse Category</h3>
        <a className="view-all-link" onClick={() => navigate('/categories')} style={{ cursor: 'pointer' }}>
          View All →
        </a>
      </div>
      <div className="category-grid">
        {shown.map((c) => (
          <div
            key={c.id}
            className="category-tile"
            style={{ cursor: 'pointer' }}
            onClick={() => navigate(`/shop?category=${c.id}`)}
          >
            <div className="circle">{c.icon_url ? <img src={c.icon_url} alt={c.name} /> : '🛍️'}</div>
            <div>{c.name}</div>
          </div>
        ))}
        {categories.length === 0 && (
          <div style={{ color: '#999', fontSize: 13, gridColumn: '1 / -1' }}>No categories yet — add them from the Admin Panel</div>
        )}
      </div>
    </div>
  );
}

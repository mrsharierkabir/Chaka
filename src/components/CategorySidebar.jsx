import { useNavigate } from 'react-router-dom';

export default function CategorySidebar({ categories }) {
  const navigate = useNavigate();
  return (
    <div className="category-sidebar">
      <h4>Shop by Category</h4>
      {categories.length === 0 && (
        <div style={{ padding: '10px 16px', fontSize: 13, color: '#999' }}>No categories yet</div>
      )}
      {categories.map((c) => (
        <div
          key={c.id}
          className="category-sidebar-item"
          style={{ cursor: 'pointer' }}
          onClick={() => navigate(`/shop?category=${c.id}`)}
        >
          {c.icon_url ? <img src={c.icon_url} alt="" style={{ width: 20, height: 20, borderRadius: 4 }} /> : '🛍️'}
          <span>{c.name}</span>
        </div>
      ))}
    </div>
  );
}

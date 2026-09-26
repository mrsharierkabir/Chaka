import { useNavigate } from 'react-router-dom';
import { formatPrice, discountPercent } from '../lib/helpers';
import { useCart } from '../context/CartContext';

export default function ProductCard({ product, categoryName }) {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const off = discountPercent(product.regular_price, product.discounted_price);
  const price = product.discounted_price || product.regular_price;
  const isVariable = product.product_type === 'variable';

  function goToProduct() {
    navigate(`/product/${product.slug || product.id}`);
  }

  return (
    <div className="product-card">
      <div className="thumb" style={{ cursor: 'pointer' }} onClick={goToProduct}>
        {off > 0 && <span className="badge-off">-{off}%</span>}
        <img src={product.images?.[0] || 'https://placehold.co/300x300?text=No+Image'} alt={product.name} />
      </div>
      <div className="body">
        {categoryName && <div className="cat">{categoryName}</div>}
        <div className="name" style={{ cursor: 'pointer' }} onClick={goToProduct}>
          {product.name}
        </div>
        <div className="price-row">
          {isVariable && <span className="from-label">From</span>}
          {formatPrice(price)}
          {off > 0 && <span className="old">{formatPrice(product.regular_price)}</span>}
        </div>
        {isVariable ? (
          <button className="btn btn-select-pill btn-block" onClick={goToProduct}>Select Option</button>
        ) : (
          <button className="btn btn-orange btn-block" disabled={product.stock <= 0} onClick={() => addItem(product, 1)}>
            {product.stock <= 0 ? 'Out of Stock' : 'Add to Cart'}
          </button>
        )}
      </div>
    </div>
  );
}

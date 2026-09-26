import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../lib/helpers';

export function MiniCartFab() {
  const { itemCount, subtotal, setIsOpen, isOpen } = useCart();
  if (isOpen || itemCount === 0) return null;
  return (
    <button className="mini-cart-fab" onClick={() => setIsOpen(true)}>
      <span className="fab-icon">🛍️</span>
      <span className="fab-count">{itemCount} ITEM{itemCount !== 1 ? 'S' : ''}</span>
      <span className="fab-price">{formatPrice(subtotal)}</span>
    </button>
  );
}

export default function CartPopup() {
  const { items, itemCount, subtotal, isOpen, setIsOpen, removeItem } = useCart();
  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    <div className="cart-popup-overlay" onClick={() => setIsOpen(false)}>
      <div className="cart-popup" onClick={(e) => e.stopPropagation()}>
        <div className="cart-popup-header">
          <span>🛒 Your Bag ({itemCount} item{itemCount !== 1 ? 's' : ''})</span>
          <button className="icon-btn" onClick={() => setIsOpen(false)}>✕</button>
        </div>
        <div className="cart-popup-body">
          {items.length === 0 ? (
            <div className="cart-popup-empty">Your cart is empty</div>
          ) : (
            items.map((it) => (
              <div className="cart-popup-row" key={it.key}>
                <img src={it.image} alt={it.name} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{it.name}</div>
                  {it.variantLabel && <div style={{ fontSize: 11, color: '#888' }}>{it.variantLabel}</div>}
                  <div style={{ fontSize: 12, color: '#888' }}>{it.qty} × {formatPrice(it.unitPrice)}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                  <strong>{formatPrice(it.qty * it.unitPrice)}</strong>
                  <button className="btn-sm" style={{ background: 'none', border: 'none', color: '#e2483a' }} onClick={() => removeItem(it.key)}>Remove</button>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="cart-popup-footer">
          <div className="cart-subtotal-row">
            <span>Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <button
            className="btn btn-teal btn-block"
            disabled={items.length === 0}
            onClick={() => { setIsOpen(false); navigate('/checkout'); }}
          >
            Checkout Now →
          </button>
          <button
            className="btn btn-block"
            style={{ background: 'none', color: 'var(--teal-text)', marginTop: 8 }}
            onClick={() => { setIsOpen(false); navigate('/cart'); }}
          >
            View Full Cart
          </button>
        </div>
      </div>
    </div>
  );
}

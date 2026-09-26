import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../lib/helpers';

export default function CartPage() {
  const { items, itemCount, subtotal, updateQty, removeItem } = useCart();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <div className="container">
        <div className="cart-page-box cart-empty">
          <h3>Your cart is empty</h3>
          <p style={{ color: '#777' }}>Start adding essential products to your bag</p>
          <button className="btn btn-teal" onClick={() => navigate('/shop')}>Browse Shop →</button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="cart-page-box">
        <h2>Your Cart</h2>
        <p style={{ color: '#777' }}>You have {itemCount} item{itemCount !== 1 ? 's' : ''} in your bag</p>

        <div className="cart-page-grid">
          <div>
            {items.map((it) => (
              <div className="cart-line" key={it.key}>
                <img src={it.image} alt={it.name} />
                <div className="cart-line-info">
                  <div style={{ fontWeight: 600 }}>{it.name}</div>
                  {it.variantLabel && <div style={{ fontSize: 12, color: '#888' }}>{it.variantLabel}</div>}
                  <div style={{ fontSize: 12, color: '#888' }}>Unit price: {formatPrice(it.unitPrice)}</div>
                </div>
                <div className="cart-line-actions">
                  <div className="qty-stepper">
                    <button type="button" onClick={() => updateQty(it.key, it.qty - 1)}>-</button>
                    <input value={it.qty} readOnly />
                    <button type="button" onClick={() => updateQty(it.key, it.qty + 1)}>+</button>
                  </div>
                  <div style={{ minWidth: 70, textAlign: 'right', fontWeight: 700 }}>{formatPrice(it.qty * it.unitPrice)}</div>
                  <button type="button" className="btn-sm" style={{ background: 'none', border: 'none', color: '#e2483a' }} onClick={() => removeItem(it.key)}>🗑 Remove</button>
                </div>
              </div>
            ))}
          </div>

          <div className="order-summary">
            <h4 style={{ marginTop: 0 }}>Order Summary</h4>
            <div className="order-summary-row"><span>Items ({itemCount})</span><span>{formatPrice(subtotal)}</span></div>
            <div className="order-summary-row"><span>Delivery charge</span><span>Calculated at checkout</span></div>
            <div className="order-summary-row order-summary-total"><span>Total Payable</span><span>{formatPrice(subtotal)}</span></div>
            <button className="btn btn-teal btn-block" onClick={() => navigate('/checkout')}>Proceed to Checkout →</button>
            <p style={{ fontSize: 11, color: '#999', marginTop: 10 }}>
              By continuing, you agree to our Terms and Conditions and privacy policy
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

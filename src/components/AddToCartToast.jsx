import { useEffect, useState } from 'react';
import { useCart } from '../context/CartContext';

export default function AddToCartToast() {
  const { lastAdded, setIsOpen } = useCart();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!lastAdded) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 2200);
    return () => clearTimeout(t);
  }, [lastAdded]);

  if (!lastAdded || !visible) return null;

  return (
    <div className="add-toast" onClick={() => { setVisible(false); setIsOpen(true); }}>
      {lastAdded.image && <img src={lastAdded.image} alt="" />}
      <div className="add-toast-text">
        <strong>✓ Added to bag</strong>
        <span>{lastAdded.name}</span>
      </div>
    </div>
  );
}

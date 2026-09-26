import { createContext, useContext, useEffect, useState } from 'react';

const CartContext = createContext(null);
const STORAGE_KEY = 'shohazbazar_cart_v1';

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [isOpen, setIsOpen] = useState(false);
  const [lastAdded, setLastAdded] = useState(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  function addItem(product, qty = 1, variantLabel = '', variantId = null) {
    setLastAdded({ name: product.name, image: product.images?.[0] || '', ts: Date.now() });
    setItems((prev) => {
      const key = `${product.id}::${variantId || variantLabel}`;
      const existing = prev.find((it) => it.key === key);
      if (existing) {
        return prev.map((it) => (it.key === key ? { ...it, qty: it.qty + qty } : it));
      }
      return [
        ...prev,
        {
          key,
          id: product.id,
          variantId,
          name: product.name,
          image: product.images?.[0] || '',
          unitPrice: product.discounted_price || product.regular_price,
          variantLabel,
          qty,
        },
      ];
    });
  }

  function updateQty(key, qty) {
    if (qty <= 0) {
      removeItem(key);
      return;
    }
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, qty } : it)));
  }

  function removeItem(key) {
    setItems((prev) => prev.filter((it) => it.key !== key));
  }

  function clearCart() {
    setItems([]);
  }

  const itemCount = items.reduce((sum, it) => sum + it.qty, 0);
  const subtotal = items.reduce((sum, it) => sum + it.qty * it.unitPrice, 0);

  return (
    <CartContext.Provider
      value={{ items, itemCount, subtotal, addItem, updateQty, removeItem, clearCart, isOpen, setIsOpen, lastAdded }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}

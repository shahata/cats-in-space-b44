import { useState, useEffect, useCallback } from 'react';

const CART_KEY = 'atelier_cart';

function getStoredCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch { return []; }
}

export default function useCart() {
  const [items, setItems] = useState(getStoredCart);

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event('cart-updated'));
  }, [items]);

  const addItem = useCallback((product) => {
    setItems(prev => {
      const idx = prev.findIndex(i => i.product_id === product.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
      return [...prev, { product_id: product.id, name: product.name, price: product.price, image: product.image, quantity: 1 }];
    });
  }, []);

  const removeItem = useCallback((productId) => {
    setItems(prev => prev.filter(i => i.product_id !== productId));
  }, []);

  const updateQuantity = useCallback((productId, qty) => {
    if (qty < 1) return;
    setItems(prev => prev.map(i => i.product_id === productId ? { ...i, quantity: qty } : i));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const count = items.reduce((s, i) => s + i.quantity, 0);

  return { items, addItem, removeItem, updateQuantity, clearCart, total, count };
}
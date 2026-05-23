import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

const CART_ID_KEY = 'wix_cart_id';

function getStoredCartId() {
  try { return localStorage.getItem(CART_ID_KEY); } catch { return null; }
}
function setStoredCartId(id) {
  try { localStorage.setItem(CART_ID_KEY, id); } catch {}
}

export default function useWixCart() {
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchCart = useCallback(async () => {
    const cartId = getStoredCartId();
    if (!cartId) { setLoading(false); return; }
    try {
      const res = await base44.functions.invoke('wixCart', { action: 'get', cartId });
      setCart(res.data.cart);
    } catch {
      // Cart may be expired, clear it
      localStorage.removeItem(CART_ID_KEY);
      setCart(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCart(); }, [fetchCart]);

  const addItem = useCallback(async (productId) => {
    setActionLoading(true);
    const cartId = getStoredCartId();
    const res = await base44.functions.invoke('wixCart', { action: 'addItem', cartId, productId, quantity: 1 });
    const newCart = res.data.cart;
    const newCartId = res.data.cartId || newCart.id;
    setStoredCartId(newCartId);
    setCart(newCart);
    window.dispatchEvent(new Event('cart-updated'));
    setActionLoading(false);
    return newCart;
  }, []);

  const removeItem = useCallback(async (lineItemId) => {
    setActionLoading(true);
    const cartId = getStoredCartId();
    const res = await base44.functions.invoke('wixCart', { action: 'removeItem', cartId, lineItemId });
    setCart(res.data.cart);
    window.dispatchEvent(new Event('cart-updated'));
    setActionLoading(false);
  }, []);

  const updateItem = useCallback(async (lineItemId, quantity) => {
    if (quantity <= 0) return removeItem(lineItemId);
    setActionLoading(true);
    const cartId = getStoredCartId();
    const res = await base44.functions.invoke('wixCart', { action: 'updateItem', cartId, lineItemId, quantity });
    setCart(res.data.cart);
    window.dispatchEvent(new Event('cart-updated'));
    setActionLoading(false);
  }, [removeItem]);

  const createCheckout = useCallback(async () => {
    const cartId = getStoredCartId();
    const res = await base44.functions.invoke('wixCart', { action: 'createCheckout', cartId });
    return res.data;
  }, []);

  const lineItems = cart?.lineItems || [];
  const count = lineItems.reduce((s, i) => s + (i.quantity || 0), 0);
  const total = parseFloat(cart?.priceSummary?.total?.amount || 0);

  return { cart, lineItems, count, total, loading, actionLoading, addItem, removeItem, updateItem, createCheckout, refetch: fetchCart };
}
import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

const CART_ID_KEY = 'wix_cart_id';
const VISITOR_TOKEN_KEY = 'wix_visitor_token';

function getStored(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function setStored(key, val) {
  try { if (val) localStorage.setItem(key, val); else localStorage.removeItem(key); } catch {}
}

export default function useWixCart() {
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const applyResponse = useCallback((resData) => {
    if (resData.cart) setCart(resData.cart);
    if (resData.cartId) setStored(CART_ID_KEY, resData.cartId);
    if (resData.visitorToken) setStored(VISITOR_TOKEN_KEY, resData.visitorToken);
  }, []);

  const invoke = useCallback(async (payload) => {
    const cartId = getStored(CART_ID_KEY);
    const visitorToken = getStored(VISITOR_TOKEN_KEY);
    const res = await base44.functions.invoke('wixCart', { ...payload, cartId, visitorToken });
    applyResponse(res.data);
    return res.data;
  }, [applyResponse]);

  const fetchCart = useCallback(async () => {
    const cartId = getStored(CART_ID_KEY);
    const visitorToken = getStored(VISITOR_TOKEN_KEY);
    // If there's a cartId but no visitor token, the session is stale — clear it
    if (!cartId || !visitorToken) {
      setStored(CART_ID_KEY, null);
      setStored(VISITOR_TOKEN_KEY, null);
      setLoading(false);
      return;
    }
    try {
      await invoke({ action: 'get' });
    } catch {
      setStored(CART_ID_KEY, null);
      setStored(VISITOR_TOKEN_KEY, null);
      setCart(null);
    } finally {
      setLoading(false);
    }
  }, [invoke]);

  useEffect(() => { fetchCart(); }, [fetchCart]);

  const addItem = useCallback(async (productId) => {
    setActionLoading(true);
    const res = await invoke({ action: 'addItem', productId, quantity: 1 });
    window.dispatchEvent(new Event('cart-updated'));
    setActionLoading(false);
    return res.cart;
  }, [invoke]);

  const removeItem = useCallback(async (lineItemId) => {
    setActionLoading(true);
    await invoke({ action: 'removeItem', lineItemId });
    window.dispatchEvent(new Event('cart-updated'));
    setActionLoading(false);
  }, [invoke]);

  const updateItem = useCallback(async (lineItemId, quantity) => {
    if (quantity <= 0) return removeItem(lineItemId);
    setActionLoading(true);
    await invoke({ action: 'updateItem', lineItemId, quantity });
    window.dispatchEvent(new Event('cart-updated'));
    setActionLoading(false);
  }, [invoke, removeItem]);

  const createCheckout = useCallback(async () => {
    const res = await invoke({ action: 'createCheckout' });
    return res;
  }, [invoke]);

  const lineItems = cart?.lineItems || [];
  const count = lineItems.reduce((s, i) => s + (i.quantity || 0), 0);
  const total = parseFloat(cart?.priceSummary?.subtotal?.amount || cart?.subtotal?.amount || 0);

  return { cart, lineItems, count, total, loading, actionLoading, addItem, removeItem, updateItem, createCheckout, refetch: fetchCart };
}
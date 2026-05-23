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

  const clearCart = useCallback(() => {
    setStored(CART_ID_KEY, null);
    setStored(VISITOR_TOKEN_KEY, null);
    setCart(null);
  }, []);

  const invoke = useCallback(async (payload) => {
    const cartId = getStored(CART_ID_KEY);
    const visitorToken = getStored(VISITOR_TOKEN_KEY);
    try {
      const res = await base44.functions.invoke('wixCart', { ...payload, cartId, visitorToken });
      applyResponse(res.data);
      return res.data;
    } catch (err) {
      // Cart no longer exists on Wix — reset local state
      if (err?.response?.status === 404) {
        clearCart();
        return {};
      }
      throw err;
    }
  }, [applyResponse, clearCart]);

  const fetchCart = useCallback(async () => {
    const cartId = getStored(CART_ID_KEY);
    const visitorToken = getStored(VISITOR_TOKEN_KEY);
    if (!cartId || !visitorToken) {
      setLoading(false);
      return;
    }
    await invoke({ action: 'get' });
    setLoading(false);
  }, [invoke]);

  useEffect(() => { fetchCart(); }, [fetchCart]);

  const addItem = useCallback(async (productId, variantId) => {
    setActionLoading(true);
    let res = await invoke({ action: 'addItem', productId, variantId: variantId || null, quantity: 1 });
    // If cart was expired and cleared, res.cart will be undefined — retry fresh
    if (!res.cart) {
      res = await invoke({ action: 'addItem', productId, variantId: variantId || null, quantity: 1 });
    }
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
    setActionLoading(true);
    await invoke({ action: 'updateItem', lineItemId, quantity: Math.max(0, quantity) });
    window.dispatchEvent(new Event('cart-updated'));
    setActionLoading(false);
  }, [invoke]);

  const createCheckout = useCallback(async () => {
    const res = await invoke({ action: 'createCheckout', postFlowUrl: window.location.origin });
    return res;
  }, [invoke]);

  const lineItems = cart?.lineItems || [];
  const count = lineItems.reduce((s, i) => s + (i.quantity || 0), 0);
  const total = parseFloat(cart?.priceSummary?.subtotal?.amount || cart?.subtotal?.amount || 0);

  return { cart, lineItems, count, total, loading, actionLoading, addItem, removeItem, updateItem, createCheckout, refetch: fetchCart };
}
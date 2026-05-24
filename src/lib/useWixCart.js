import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { getWixTokens } from './wixClient';

// Cart identity is managed entirely by Wix's currentCart API, keyed off the
// session tokens. We don't track cartId on the client anymore.
export default function useWixCart() {
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const invoke = useCallback(async (payload) => {
    const wixTokens = getWixTokens();
    if (!wixTokens?.accessToken?.value) return {};
    const res = await base44.functions.invoke('wixCart', { ...payload, wixTokens });
    if (res.data && 'cart' in res.data) setCart(res.data.cart || null);
    return res.data || {};
  }, []);

  const fetchCart = useCallback(async () => {
    await invoke({ action: 'get' });
    setLoading(false);
  }, [invoke]);

  useEffect(() => { fetchCart(); }, [fetchCart]);

  const addItem = useCallback(async (productId, variantId, choices) => {
    setActionLoading(true);
    const res = await invoke({ action: 'addItem', productId, variantId: variantId || null, choices: choices || null, quantity: 1 });
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
    let userEmail = null;
    let userFullName = '';
    try {
      const authed = await base44.auth.isAuthenticated();
      if (authed) {
        const me = await base44.auth.me();
        userEmail = me?.email || null;
        userFullName = me?.full_name || '';
      }
    } catch {}
    const res = await invoke({
      action: 'createCheckout',
      postFlowUrl: window.location.origin,
      userEmail,
      userFullName,
    });
    return res;
  }, [invoke]);

  const lineItems = cart?.lineItems || [];
  const count = lineItems.reduce((s, i) => s + (i.quantity || 0), 0);
  const total = parseFloat(cart?.priceSummary?.subtotal?.amount || cart?.subtotal?.amount || 0);
  const formattedTotal = cart?.priceSummary?.subtotal?.formattedAmount || cart?.subtotal?.formattedAmount || null;

  return { cart, lineItems, count, total, formattedTotal, loading, actionLoading, addItem, removeItem, updateItem, createCheckout, refetch: fetchCart };
}
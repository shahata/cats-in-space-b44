import { createClient, OAuthStrategy } from 'npm:@wix/sdk@1.21.12';
import { cart } from 'npm:@wix/ecom@1.0.2074';

Deno.serve(async (req) => {
  try {
    const clientId = Deno.env.get('WIX_CLIENT_ID');
    if (!clientId) return Response.json({ error: 'Missing WIX_CLIENT_ID' }, { status: 500 });

    const body = await req.json().catch(() => ({}));
    const { action, cartId, lines = [] } = body;

    const wix = createClient({
      modules: { cart },
      auth: OAuthStrategy({ clientId }),
    });

    if (action === 'get') {
      const res = await wix.cart.getCart(cartId).catch(e => {
        console.error('[wixCart] get:', e.message);
        return null;
      });
      return Response.json({ cart: res || {} });
    }

    if (action === 'add') {
      const res = await wix.cart.addToCart(cartId, { lineItems: lines }).catch(e => {
        console.error('[wixCart] add:', e.message);
        return null;
      });
      return Response.json({ cart: res?.cart || res || {} });
    }

    if (action === 'remove') {
      const ids = lines.map(l => typeof l === 'string' ? l : l.id || l._id).filter(Boolean);
      const res = await wix.cart.removeLineItems(cartId, ids).catch(e => {
        console.error('[wixCart] remove:', e.message);
        return null;
      });
      return Response.json({ cart: res?.cart || res || {} });
    }

    if (action === 'update') {
      const res = await wix.cart.updateLineItemsQuantity(cartId, { lineItems: lines }).catch(e => {
        console.error('[wixCart] update:', e.message);
        return null;
      });
      return Response.json({ cart: res?.cart || res || {} });
    }

    return Response.json({ error: 'Invalid action', cart: {} });
  } catch (err) {
    console.error('[wixCart] Exception:', err.message);
    return Response.json({ error: err.message, cart: {} }, { status: 500 });
  }
});
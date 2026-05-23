import { createClient, OAuthStrategy } from 'npm:@wix/sdk@1.21.12';

Deno.serve(async (req) => {
  try {
    const clientId = Deno.env.get('WIX_CLIENT_ID');
    if (!clientId) return Response.json({ error: 'Missing WIX_CLIENT_ID' }, { status: 500 });

    const body = await req.json().catch(() => ({}));
    const { action, cartId, visitorToken, lines = [] } = body;

    const wix = createClient({
      auth: OAuthStrategy({ clientId }),
    });

    const baseUrl = 'https://www.wixapis.com/ecom/v1/carts';

    if (action === 'get') {
      const res = await wix.fetch(`${baseUrl}/${cartId}`, { method: 'GET' }).then(r => r.json()).catch(e => {
        console.error('[wixCart] get:', e.message);
        return null;
      });
      return Response.json({ cart: res || {} });
    }

    if (action === 'add') {
      const res = await wix.fetch(`${baseUrl}/${cartId}/line-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lineItems: lines }),
      }).then(r => r.json()).catch(e => {
        console.error('[wixCart] add:', e.message);
        return null;
      });
      return Response.json({ cart: res || {} });
    }

    if (action === 'remove') {
      const res = await wix.fetch(`${baseUrl}/${cartId}/line-items`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lineItemIds: lines }),
      }).then(r => r.json()).catch(e => {
        console.error('[wixCart] remove:', e.message);
        return null;
      });
      return Response.json({ cart: res || {} });
    }

    if (action === 'update') {
      const res = await wix.fetch(`${baseUrl}/${cartId}/line-items`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lineItems: lines }),
      }).then(r => r.json()).catch(e => {
        console.error('[wixCart] update:', e.message);
        return null;
      });
      return Response.json({ cart: res || {} });
    }

    return Response.json({ error: 'Invalid action', cart: {} });
  } catch (err) {
    console.error('[wixCart] Exception:', err.message);
    return Response.json({ error: err.message, cart: {} }, { status: 500 });
  }
});
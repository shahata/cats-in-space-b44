import { createClient, OAuthStrategy } from 'npm:@wix/sdk@1.21.12';

function processOrder(o) {
  if (!o) return null;
  return {
    id: o._id || o.id,
    number: o.number || '',
    status: o.fulfillmentStatus || o.status,
    total: parseFloat(o.totals?.total || 0),
    currency: o.currency || 'USD',
    lineItems: (o.lineItems || []).map(li => ({
      catalogItemId: li.catalogReference?.catalogItemId || li.productId,
      name: li.productName?.original || li.name,
      quantity: li.quantity,
      price: parseFloat(li.price?.amount || 0),
    })),
    buyerInfo: {
      email: o.buyerInfo?.email,
      firstName: o.buyerInfo?.firstName,
      lastName: o.buyerInfo?.lastName,
    },
    createdDate: o.dateCreated,
  };
}

Deno.serve(async (req) => {
  try {
    const clientId = Deno.env.get('WIX_CLIENT_ID');
    if (!clientId) return Response.json({ error: 'Missing WIX_CLIENT_ID' }, { status: 500 });

    const body = await req.json().catch(() => ({}));
    const { orderId, limit = 20 } = body;

    const wix = createClient({
      auth: OAuthStrategy({ clientId }),
    });

    if (orderId) {
      const order = await wix
        .fetch(`https://www.wixapis.com/ecom/v1/orders/${orderId}`, { method: 'GET' })
        .then(r => r.json())
        .catch(e => {
          console.error('[getWixOrders] get:', e.message);
          return null;
        });
      return Response.json({ order: processOrder(order), orders: [] });
    }

    const res = await wix
      .fetch('https://www.wixapis.com/ecom/v1/orders/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          limit,
          sort: { fieldName: 'dateCreated', direction: 'DESC' },
        }),
      })
      .then(r => r.json())
      .catch(e => {
        console.error('[getWixOrders] search:', e.message);
        return { orders: [] };
      });

    const list = (res.orders || []).map(processOrder).filter(Boolean);
    return Response.json({ orders: list });
  } catch (err) {
    console.error('[getWixOrders] Exception:', err.message);
    return Response.json({ error: err.message, orders: [] }, { status: 500 });
  }
});
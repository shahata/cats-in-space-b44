import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function getWixAccessToken(clientId, clientSecret) {
  const res = await fetch('https://www.wixapis.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId, clientSecret, grantType: 'client_credentials' }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error('Failed to get Wix token: ' + JSON.stringify(data));
  return data.access_token;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const clientId = Deno.env.get('WIX_CLIENT_ID');
    const clientSecret = Deno.env.get('WIX_CLIENT_SECRET');
    const instanceId = Deno.env.get('WIX_INSTANCE_ID');

    if (!clientId || !clientSecret || !instanceId) {
      return Response.json({ error: 'Missing Wix credentials' }, { status: 500 });
    }

    const accessToken = await getWixAccessToken(clientId, clientSecret);

    const searchRes = await fetch('https://www.wixapis.com/ecom/v1/orders/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'wix-site-id': instanceId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filter: { 'buyerInfo.email': user.email },
        sort: [{ fieldName: '_createdDate', order: 'DESC' }],
        cursorPaging: { limit: 50 },
      }),
    });

    const searchData = await searchRes.json();

    if (!searchRes.ok) {
      return Response.json({ error: searchData }, { status: searchRes.status });
    }

    const orders = (searchData.orders || []).map(o => ({
      id: o._id,
      number: o.number,
      createdDate: o._createdDate,
      status: o.fulfillmentStatus || o.status,
      paymentStatus: o.paymentStatus,
      total: o.priceSummary?.total?.formattedAmount || o.totals?.total,
      lineItems: (o.lineItems || []).map(li => ({
        name: li.productName?.translated || li.productName?.original || li.name,
        quantity: li.quantity,
        price: li.price?.formattedAmount || li.price?.amount,
        image: li.image?.url,
      })),
    }));

    return Response.json({ orders });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
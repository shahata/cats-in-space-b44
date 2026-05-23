import { createClient, OAuthStrategy } from 'npm:@wix/sdk@1.21.12';

Deno.serve(async (req) => {
  try {
    const clientId = Deno.env.get('WIX_CLIENT_ID');
    if (!clientId) return Response.json({ error: 'Missing WIX_CLIENT_ID' }, { status: 500 });

    const body = await req.json().catch(() => ({}));
    const { lineItems = [], email = '', firstName = '', lastName = '' } = body;

    const wix = createClient({
      auth: OAuthStrategy({ clientId }),
    });

    const checkoutUrl = 'https://www.wixapis.com/ecom/v1/checkouts';

    const checkoutPayload = {
      lineItems: lineItems.map(li => ({
        catalogReference: {
          catalogItemId: li.catalogItemId || li.productId,
          appId: '1380b703-ce81-ff05-7226-cd87d7d4b591',
        },
        quantity: li.quantity || 1,
      })),
    };
    if (email) {
      checkoutPayload.billingContact = { email, firstName, lastName };
    }

    const checkoutRes = await wix
      .fetch(checkoutUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checkoutPayload),
      })
      .then(r => r.json())
      .catch(e => {
        console.error('[createWixCheckout] checkout:', e.message);
        return null;
      });

    if (!checkoutRes?.id) return Response.json({ error: 'Checkout creation failed' }, { status: 500 });

    const sessionRes = await wix
      .fetch(`${checkoutUrl}/${checkoutRes.id}/checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkoutId: checkoutRes.id }),
      })
      .then(r => r.json())
      .catch(e => {
        console.error('[createWixCheckout] session:', e.message);
        return null;
      });

    if (!sessionRes?.redirectUrl) return Response.json({ error: 'Session creation failed' }, { status: 500 });

    return Response.json({
      checkoutId: checkoutRes.id,
      sessionUrl: sessionRes.redirectUrl,
    });
  } catch (err) {
    console.error('[createWixCheckout] Exception:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});
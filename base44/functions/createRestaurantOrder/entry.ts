import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function safeJson(res) {
  const text = await res.text();
  try { return text ? JSON.parse(text) : {}; } catch { return { _raw: text }; }
}

async function getAnonToken(clientId) {
  const res = await fetch("https://www.wixapis.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId, grantType: "anonymous" }),
  });
  const data = await safeJson(res);
  if (!res.ok) throw new Error("Token error: " + JSON.stringify(data));
  return data.access_token;
}

Deno.serve(async (req) => {
  try {
    const clientId = Deno.env.get("WIX_CLIENT_ID");
    const instanceId = Deno.env.get("WIX_INSTANCE_ID");
    if (!clientId || !instanceId) return Response.json({ error: "Missing config" }, { status: 500 });

    const body = await req.json().catch(() => ({}));
    const { items, pickupTime, fulfillmentMethod = 'PICKUP', notes } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return Response.json({ error: 'No items provided' }, { status: 400 });
    }

    const accessToken = await getAnonToken(clientId);
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'wix-site-id': instanceId,
      'Content-Type': 'application/json',
    };

    // Step 1: Create cart with restaurant items
    const cartRes = await fetch('https://www.wixapis.com/stores/v2/carts', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        lineItems: items.map(item => ({
          catalogReference: {
            appId: '1380b703-ce81-ff05-705f-005056af0feb', // Wix Restaurants app ID
            catalogItemId: item.id,
          },
          quantity: item.quantity,
        })),
      }),
    });
    const cartData = await safeJson(cartRes);

    if (!cartRes.ok) {
      console.error('[createRestaurantOrder] Cart error:', JSON.stringify(cartData));
      // Fallback: redirect to restaurant ordering page
      const configRes = await fetch('https://www.wixapis.com/sites/v1/sites/current', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const configData = await safeJson(configRes);
      const siteId = instanceId || configData?.site?.displayName;
      const fallbackUrl = `https://${siteId}.wixsite.com/restaurant`;
      return Response.json({ checkoutUrl: fallbackUrl });
    }

    const cartId = cartData.cart?.id;

    // Step 2: Create checkout session
    const checkoutRes = await fetch(`https://www.wixapis.com/checkouts/v1/checkouts`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        cartId,
        fulfillmentMethod: {
          type: fulfillmentMethod, // PICKUP or DELIVERY
          ...(pickupTime && { pickupTime }),
        },
        buyerNote: notes,
      }),
    });
    const checkoutData = await safeJson(checkoutRes);

    if (!checkoutRes.ok) {
      console.error('[createRestaurantOrder] Checkout error:', JSON.stringify(checkoutData));
      const configRes = await fetch('https://www.wixapis.com/sites/v1/sites/current', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const configData = await safeJson(configRes);
      const siteId = instanceId || configData?.site?.displayName;
      const fallbackUrl = `https://${siteId}.wixsite.com/restaurant`;
      return Response.json({ checkoutUrl: fallbackUrl });
    }

    const checkoutUrl = checkoutData.checkout?.url || checkoutData.redirectSession?.fullUrl;

    return Response.json({ checkoutUrl, cartId });

  } catch (err) {
    console.error('[createRestaurantOrder] Exception:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});
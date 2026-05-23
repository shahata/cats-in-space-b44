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
    const clientSecret = Deno.env.get("WIX_CLIENT_SECRET");
    const instanceId = Deno.env.get("WIX_INSTANCE_ID");
    const siteId = Deno.env.get("WIX_SITE_ID");
    
    if (!clientId || !instanceId || !siteId) {
      return Response.json({ error: "Missing Wix config" }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const { campaignName, amount, frequency = 'one-time' } = body;

    if (!amount || amount <= 0) {
      return Response.json({ error: "Invalid amount" }, { status: 400 });
    }

    // Get anonymous token
    const accessToken = await getAnonToken(clientId);
    
    // Create cart using Wix Stores API v2
    const createCartRes = await fetch('https://www.wixapis.com/stores/v2/carts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'wix-site-id': instanceId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        lineItems: [{
          product: {
            name: `Donation - ${campaignName}`,
            description: `${frequency} donation to ${campaignName}`,
          },
          quantity: 1,
          priceData: {
            price: { amount: amount.toString(), currency: 'USD' },
          },
        }],
      }),
    });
    
    const cartData = await safeJson(createCartRes);
    if (!createCartRes.ok) {
      console.error('[createWixDonationCheckout] Cart creation failed:', JSON.stringify(cartData));
      // Fallback: redirect to Wix donations page
      return Response.json({ 
        checkoutUrl: `https://${siteId}.wixsite.com/donate?amount=${amount}&campaign=${encodeURIComponent(campaignName)}`,
        cartId: null, 
        visitorToken: null 
      });
    }

    const cartId = cartData.cart?.id || cartData.id;
    const visitorToken = cartData.cart?.visitorId || cartData.visitorId;

    // Create checkout session
    const checkoutRes = await fetch(`https://www.wixapis.com/stores/v2/carts/${cartId}/checkout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'wix-site-id': instanceId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channelType: 'WEB',
      }),
    });

    const checkoutData = await safeJson(checkoutRes);
    if (!checkoutRes.ok) {
      console.error('[createWixDonationCheckout] Checkout creation failed:', JSON.stringify(checkoutData));
      return Response.json({ 
        checkoutUrl: `https://${siteId}.wixsite.com/donate?amount=${amount}&campaign=${encodeURIComponent(campaignName)}`,
        cartId, 
        visitorToken 
      });
    }

    const checkoutId = checkoutData.checkoutId || checkoutData.checkout?.id;
    let checkoutUrl = checkoutData.checkoutUrl || checkoutData.redirectUrl;

    // Hand off to Wix's hosted checkout via the Create Redirect Session API.
    if (checkoutId) {
      try {
        const sessionRes = await fetch('https://www.wixapis.com/_api/redirects-api/v1/redirect-session', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'wix-site-id': instanceId,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            redirectSession: {
              ecomCheckout: { checkoutId },
              callbacks: { postFlowUrl: req.headers.get('referer') || '' },
            },
          }),
        });
        const sessionData = await safeJson(sessionRes);
        if (sessionRes.ok && sessionData.redirectSession?.fullUrl) {
          checkoutUrl = sessionData.redirectSession.fullUrl;
        } else {
          console.error('[createWixDonationCheckout] Redirect session failed:', JSON.stringify(sessionData));
        }
      } catch (e) {
        console.error('[createWixDonationCheckout] Redirect session error:', e.message);
      }
    }

    return Response.json({ checkoutUrl, cartId, visitorToken });

  } catch (err) {
    console.error('[createWixDonationCheckout] Exception:', err.message);
    return Response.json({ error: err.message, checkoutUrl: null }, { status: 500 });
  }
});
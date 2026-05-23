import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function getWixAccessToken(clientId) {
  const tokenResponse = await fetch("https://www.wixapis.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clientId: clientId,
      grantType: "anonymous",
    }),
  });

  const tokenData = await tokenResponse.json();
  if (!tokenResponse.ok) {
    throw new Error("Failed to get Wix access token: " + JSON.stringify(tokenData));
  }
  return tokenData.access_token;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { items, email, customerName, address } = await req.json();

    if (!items || items.length === 0) {
      return Response.json({ error: "No items in checkout" }, { status: 400 });
    }

    const clientId = Deno.env.get("WIX_CLIENT_ID");
    const instanceId = Deno.env.get("WIX_INSTANCE_ID");

    if (!clientId || !instanceId) {
      return Response.json({ error: "Missing Wix credentials" }, { status: 500 });
    }

    const accessToken = await getWixAccessToken(clientId);

    // Create checkout
    const checkoutResponse = await fetch("https://www.wixapis.com/ecom/v1/checkouts", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "wix-site-id": instanceId,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channelType: "WEB",
        lineItems: items.map(item => ({
          catalogReference: {
            appId: "1380b703-ce81-ff05-f115-39571d94dfcd",
            catalogItemId: item.wixId,
          },
          quantity: item.quantity,
        })),
        checkoutInfo: {
          buyerInfo: {
            email: email,
          },
          shippingInfo: {
            shippingDestination: {
              address: {
                country: "US",
                addressLine: address,
              },
              contactDetails: {
                firstName: customerName.split(" ")[0],
                lastName: customerName.split(" ").slice(1).join(" "),
              },
            },
          },
        },
      }),
    });

    const checkoutData = await checkoutResponse.json();

    if (!checkoutResponse.ok) {
      return Response.json({ error: checkoutData }, { status: checkoutResponse.status });
    }

    const checkoutId = checkoutData.checkout?.id;

    // Hand off to Wix's hosted checkout via the Create Redirect Session API.
    let checkoutUrl = checkoutData.checkout?.checkoutUrl;
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
      const sessionData = await sessionRes.json().catch(() => ({}));
      if (sessionRes.ok && sessionData.redirectSession?.fullUrl) {
        checkoutUrl = sessionData.redirectSession.fullUrl;
      } else {
        console.error('[createWixCheckout] Redirect session failed:', JSON.stringify(sessionData));
      }
    } catch (e) {
      console.error('[createWixCheckout] Redirect session error:', e.message);
    }

    return Response.json({
      checkoutId,
      checkoutUrl,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
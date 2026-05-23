import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

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
    const clientSecret = Deno.env.get("WIX_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      return Response.json({ error: "Missing Wix credentials" }, { status: 500 });
    }

    // Get access token
    const tokenResponse = await fetch("https://www.wixapis.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) {
      return Response.json({ error: "Failed to get access token" }, { status: 500 });
    }

    const accessToken = tokenData.access_token;

    // Create checkout
    const checkoutResponse = await fetch("https://www.wixapis.com/ecom/v1/checkouts", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
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

    return Response.json({
      checkoutId: checkoutData.checkout.id,
      checkoutUrl: checkoutData.checkout.checkoutUrl,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
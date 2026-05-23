import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const WIX_STORES_APP_ID = "1380b703-ce81-ff05-f115-39571d94dfcd";

async function getWixAccessToken(clientId) {
  const tokenResponse = await fetch("https://www.wixapis.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId, grantType: "anonymous" }),
  });
  const tokenData = await tokenResponse.json();
  if (!tokenResponse.ok) throw new Error("Failed to get Wix access token");
  return tokenData.access_token;
}

function wixHeaders(accessToken, instanceId) {
  return {
    "Authorization": `Bearer ${accessToken}`,
    "wix-site-id": instanceId,
    "Content-Type": "application/json",
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const clientId = Deno.env.get("WIX_CLIENT_ID");
    const instanceId = Deno.env.get("WIX_INSTANCE_ID");
    if (!clientId || !instanceId) {
      return Response.json({ error: "Missing Wix credentials" }, { status: 500 });
    }

    const { action, cartId, productId, quantity, lineItemId } = await req.json();
    const accessToken = await getWixAccessToken(clientId);
    const headers = wixHeaders(accessToken, instanceId);

    // CREATE CART
    if (action === "create") {
      const res = await fetch("https://www.wixapis.com/ecom/v1/carts", {
        method: "POST",
        headers,
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) return Response.json({ error: data }, { status: res.status });
      return Response.json({ cart: data.cart });
    }

    // GET CART
    if (action === "get") {
      const res = await fetch(`https://www.wixapis.com/ecom/v1/carts/${cartId}`, {
        method: "GET",
        headers,
      });
      const data = await res.json();
      if (!res.ok) return Response.json({ error: data }, { status: res.status });
      return Response.json({ cart: data.cart });
    }

    // ADD ITEM
    if (action === "addItem") {
      let cid = cartId;
      // Create cart if no cartId
      if (!cid) {
        const createRes = await fetch("https://www.wixapis.com/ecom/v1/carts", {
          method: "POST",
          headers,
          body: JSON.stringify({}),
        });
        const createData = await createRes.json();
        if (!createRes.ok) return Response.json({ error: createData }, { status: createRes.status });
        cid = createData.cart.id;
      }

      const res = await fetch(`https://www.wixapis.com/ecom/v1/carts/${cid}/items`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          lineItems: [{
            catalogReference: {
              appId: WIX_STORES_APP_ID,
              catalogItemId: productId,
            },
            quantity: quantity || 1,
          }],
        }),
      });
      const data = await res.json();
      if (!res.ok) return Response.json({ error: data }, { status: res.status });
      return Response.json({ cart: data.cart, cartId: cid });
    }

    // REMOVE LINE ITEM
    if (action === "removeItem") {
      const res = await fetch(`https://www.wixapis.com/ecom/v1/carts/${cartId}/line-items/remove`, {
        method: "POST",
        headers,
        body: JSON.stringify({ lineItemIds: [lineItemId] }),
      });
      const data = await res.json();
      if (!res.ok) return Response.json({ error: data }, { status: res.status });
      return Response.json({ cart: data.cart });
    }

    // UPDATE LINE ITEM QUANTITY
    if (action === "updateItem") {
      const res = await fetch(`https://www.wixapis.com/ecom/v1/carts/${cartId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          cart: {
            lineItems: [{ id: lineItemId, quantity }],
          },
          mask: { paths: ["lineItems.quantity"] },
        }),
      });
      const data = await res.json();
      if (!res.ok) return Response.json({ error: data }, { status: res.status });
      return Response.json({ cart: data.cart });
    }

    // CREATE CHECKOUT FROM CART
    if (action === "createCheckout") {
      const res = await fetch(`https://www.wixapis.com/ecom/v1/carts/${cartId}/createCheckout`, {
        method: "POST",
        headers,
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) return Response.json({ error: data }, { status: res.status });

      // Get the checkout URL
      const checkoutId = data.checkoutId;
      const checkoutRes = await fetch(`https://www.wixapis.com/ecom/v1/checkouts/${checkoutId}`, {
        method: "GET",
        headers,
      });
      const checkoutData = await checkoutRes.json();
      if (!checkoutRes.ok) return Response.json({ error: checkoutData }, { status: checkoutRes.status });

      return Response.json({
        checkoutId,
        checkoutUrl: checkoutData.checkout?.checkoutUrl,
      });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
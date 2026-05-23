const WIX_STORES_APP_ID = "215238eb-22a5-4c36-9e7b-e7c08025e04e";

async function safeJson(res) {
  const text = await res.text();
  try { return text ? JSON.parse(text) : {}; } catch { return { _raw: text }; }
}

async function getNewVisitorTokens(clientId) {
  const tokenResponse = await fetch("https://www.wixapis.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId, grantType: "anonymous" }),
  });
  const tokenData = await safeJson(tokenResponse);
  if (!tokenResponse.ok) throw new Error("Failed to get Wix token: " + JSON.stringify(tokenData));
  return { accessToken: tokenData.access_token, refreshToken: tokenData.refresh_token };
}

async function refreshVisitorToken(refreshToken) {
  const tokenResponse = await fetch("https://www.wixapis.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken, grantType: "refresh_token" }),
  });
  const tokenData = await safeJson(tokenResponse);
  if (!tokenResponse.ok) return null;
  return { accessToken: tokenData.access_token, refreshToken: tokenData.refresh_token };
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
    const clientId = Deno.env.get("WIX_CLIENT_ID");
    const instanceId = Deno.env.get("WIX_INSTANCE_ID");
    if (!clientId || !instanceId) {
      return Response.json({ error: "Missing Wix credentials" }, { status: 500 });
    }

    const rawText = await req.text();
    let body = {};
    try { if (rawText) body = JSON.parse(rawText); } catch {}
    const url = new URL(req.url);
    if (!body.action) {
      url.searchParams.forEach((v, k) => { body[k] = v === 'null' ? null : v; });
    }

    const { action, cartId, productId, lineItemId } = body;
    const quantity = body.quantity ? parseInt(body.quantity) : 1;
    let visitorToken = body.visitorToken || null;

    // Get or refresh visitor token
    let accessToken;
    let newRefreshToken = null;
    if (visitorToken) {
      const renewed = await refreshVisitorToken(visitorToken);
      if (renewed) {
        accessToken = renewed.accessToken;
        newRefreshToken = renewed.refreshToken;
      } else {
        // Token expired, get new one
        const tokens = await getNewVisitorTokens(clientId);
        accessToken = tokens.accessToken;
        newRefreshToken = tokens.refreshToken;
      }
    } else {
      const tokens = await getNewVisitorTokens(clientId);
      accessToken = tokens.accessToken;
      newRefreshToken = tokens.refreshToken;
    }

    const headers = wixHeaders(accessToken, instanceId);

    // GET CART
    if (action === "get") {
      const res = await fetch(`https://www.wixapis.com/ecom/v1/carts/${cartId}`, {
        method: "GET",
        headers,
      });
      const data = await safeJson(res);
      if (!res.ok) return Response.json({ error: data }, { status: res.status });
      return Response.json({ cart: data.cart, visitorToken: newRefreshToken });
    }

    // ADD ITEM — create cart with item if no cartId, otherwise add to existing cart
    if (action === "addItem") {
      if (!cartId) {
        // Create cart with item in one request (single token)
        const res = await fetch("https://www.wixapis.com/ecom/v1/carts", {
          method: "POST",
          headers,
          body: JSON.stringify({
            lineItems: [{
              catalogReference: { appId: WIX_STORES_APP_ID, catalogItemId: productId },
              quantity: quantity || 1,
            }],
          }),
        });
        const data = await safeJson(res);
        if (!res.ok) return Response.json({ error: data }, { status: res.status });
        return Response.json({ cart: data.cart, cartId: data.cart.id, visitorToken: newRefreshToken });
      } else {
        const res = await fetch(`https://www.wixapis.com/ecom/v1/carts/${cartId}/add-to-cart`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            lineItems: [{
              catalogReference: { appId: WIX_STORES_APP_ID, catalogItemId: productId },
              quantity: quantity || 1,
            }],
          }),
        });
        const data = await safeJson(res);
        if (!res.ok) return Response.json({ error: data }, { status: res.status });
        return Response.json({ cart: data.cart, cartId, visitorToken: newRefreshToken });
      }
    }

    // REMOVE LINE ITEM
    if (action === "removeItem") {
      const res = await fetch(`https://www.wixapis.com/ecom/v1/carts/${cartId}/line-items/remove`, {
        method: "POST",
        headers,
        body: JSON.stringify({ lineItemIds: [lineItemId] }),
      });
      const data = await safeJson(res);
      if (!res.ok) return Response.json({ error: data }, { status: res.status });
      return Response.json({ cart: data.cart, visitorToken: newRefreshToken });
    }

    // UPDATE LINE ITEM QUANTITY
    if (action === "updateItem") {
      const res = await fetch(`https://www.wixapis.com/ecom/v1/carts/${cartId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          cart: { lineItems: [{ id: lineItemId, quantity }] },
          mask: { paths: ["lineItems.quantity"] },
        }),
      });
      const data = await safeJson(res);
      if (!res.ok) return Response.json({ error: data }, { status: res.status });
      return Response.json({ cart: data.cart, visitorToken: newRefreshToken });
    }

    // CREATE CHECKOUT FROM CART
    if (action === "createCheckout") {
      // Step 1: create checkout from cart
      const checkoutRes = await fetch(`https://www.wixapis.com/ecom/v1/carts/${cartId}/create-checkout`, {
        method: "POST",
        headers,
        body: JSON.stringify({ channelType: "WEB" }),
      });
      const checkoutData = await safeJson(checkoutRes);
      if (!checkoutRes.ok) return Response.json({ error: checkoutData }, { status: checkoutRes.status });

      const checkoutId = checkoutData.checkoutId;

      // Step 2: create a redirect session to get the hosted checkout URL
      const redirectRes = await fetch("https://www.wixapis.com/redirect-session/v1/redirect-session", {
        method: "POST",
        headers,
        body: JSON.stringify({
          ecomCheckout: { checkoutId },
          callbacks: { postFlowUrl: "https://www.google.com" },
        }),
      });
      const redirectData = await safeJson(redirectRes);
      if (!redirectRes.ok) return Response.json({ error: redirectData }, { status: redirectRes.status });

      return Response.json({
        checkoutId,
        checkoutUrl: redirectData.redirectSession?.fullUrl,
        visitorToken: newRefreshToken,
      });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
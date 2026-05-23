const WIX_STORES_APP_ID = "215238eb-22a5-4c36-9e7b-e7c08025e04e";

async function safeJson(res) {
  const text = await res.text();
  try { return text ? JSON.parse(text) : {}; } catch { return { _raw: text }; }
}

async function getAdminToken(clientId, clientSecret) {
  const res = await fetch('https://www.wixapis.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId, clientSecret, grantType: 'client_credentials' }),
  });
  const data = await safeJson(res);
  if (!res.ok) throw new Error('Failed to get admin token: ' + JSON.stringify(data));
  return data.access_token;
}

async function getMemberTokens(instanceId, clientId, clientSecret, email) {
  // Step 1: get admin token
  const adminToken = await getAdminToken(clientId, clientSecret);
  const adminHeaders = { 'Authorization': `Bearer ${adminToken}`, 'wix-site-id': instanceId, 'Content-Type': 'application/json' };

  // Step 2: find member by loginEmail
  const memberRes = await fetch('https://www.wixapis.com/members/v1/members/query', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({ query: { filter: JSON.stringify({ 'loginEmail': { '$eq': email } }) } }),
  });
  const memberData = await safeJson(memberRes);
  console.log('[checkout] member query status:', memberRes.status, 'count:', memberData.members?.length ?? memberData.total ?? 0);
  if (!memberRes.ok || !memberData.members?.length) return null;

  const memberId = memberData.members[0].id || memberData.members[0]._id;
  console.log('[checkout] memberId found:', memberId);
  if (!memberId) return null;

  // Step 3: generate member token using admin API
  const tokenRes = await fetch('https://www.wixapis.com/iam/v1/tokens/member-token-by-id', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({ memberId }),
  });
  const tokenData = await safeJson(tokenRes);
  console.log('[checkout] member token status:', tokenRes.status, JSON.stringify(tokenData).slice(0, 200));
  if (!tokenRes.ok) return null;

  const access = tokenData.accessToken || tokenData.access_token || tokenData.token?.accessToken;
  const refresh = tokenData.refreshToken || tokenData.refresh_token || tokenData.token?.refreshToken;
  if (!access) return null;

  return { accessToken: access, refreshToken: refresh };
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

    const { action, cartId, productId, lineItemId, variantId, postFlowUrl } = body;
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
              catalogReference: { appId: WIX_STORES_APP_ID, catalogItemId: productId, ...(variantId ? { options: { variantId } } : {}) },
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
              catalogReference: { appId: WIX_STORES_APP_ID, catalogItemId: productId, ...(variantId ? { options: { variantId } } : {}) },
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
      const res = await fetch(`https://www.wixapis.com/ecom/v1/carts/${cartId}/remove-line-items`, {
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
      if (!quantity || quantity <= 0) {
        // Treat as remove
        const res = await fetch(`https://www.wixapis.com/ecom/v1/carts/${cartId}/remove-line-items`, {
          method: "POST", headers,
          body: JSON.stringify({ lineItemIds: [lineItemId] }),
        });
        const data = await safeJson(res);
        if (!res.ok) return Response.json({ error: data }, { status: res.status });
        return Response.json({ cart: data.cart, visitorToken: newRefreshToken });
      }
      const res = await fetch(`https://www.wixapis.com/ecom/v1/carts/${cartId}/update-line-items-quantity`, {
        method: "POST", headers,
        body: JSON.stringify({ lineItems: [{ id: lineItemId, quantity }] }),
      });
      const data = await safeJson(res);
      if (!res.ok) return Response.json({ error: data }, { status: res.status });
      return Response.json({ cart: data.cart, visitorToken: newRefreshToken });
    }

    // CREATE CHECKOUT FROM CART
    if (action === "createCheckout") {
      const userEmail = body.userEmail || null;

      // Step 1: create checkout from cart
      const checkoutRes = await fetch(`https://www.wixapis.com/ecom/v1/carts/${cartId}/create-checkout`, {
        method: "POST",
        headers,
        body: JSON.stringify({ channelType: "WEB" }),
      });
      const checkoutData = await safeJson(checkoutRes);
      if (!checkoutRes.ok) return Response.json({ error: checkoutData }, { status: checkoutRes.status });

      const checkoutId = checkoutData.checkoutId;

      // Step 2: try to get member tokens if user is logged in
      let memberTokens = null;
      if (userEmail) {
        try {
          const clientSecret = Deno.env.get('WIX_CLIENT_SECRET');
          memberTokens = await getMemberTokens(instanceId, clientId, clientSecret, userEmail);
        } catch (e) { console.log('[checkout] member token error:', e.message); }
      }

      // Step 3: create a redirect session to get the hosted checkout URL
      const redirectBody = {
        ecomCheckout: { checkoutId },
        callbacks: { postFlowUrl: postFlowUrl || "https://www.google.com" },
      };
      if (memberTokens) {
        redirectBody.memberTokens = memberTokens;
      }

      const redirectRes = await fetch("https://www.wixapis.com/redirect-session/v1/redirect-session", {
        method: "POST",
        headers,
        body: JSON.stringify(redirectBody),
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
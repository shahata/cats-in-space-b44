const WIX_STORES_APP_ID = "215238eb-22a5-4c36-9e7b-e7c08025e04e";

async function safeJson(res) {
  const text = await res.text();
  try { return text ? JSON.parse(text) : {}; } catch { return { _raw: text }; }
}

// Generate PKCE code verifier (random 43-128 char string)
function generateCodeVerifier() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Generate code challenge from verifier (SHA-256 base64url)
async function generateCodeChallenge(verifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function getMemberTokens(visitorAccessToken, instanceId, clientId, email, fullName) {
  // Step 1: Sign-On server-to-server (no password needed)
  const nameParts = (fullName || '').split(' ');
  const signOnRes = await fetch('https://www.wixapis.com/_api/iam/authentication/v2/sign-on', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${visitorAccessToken}`, 'wix-site-id': instanceId, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      loginId: { email },
      profile: { firstName: nameParts[0] || '', lastName: nameParts.slice(1).join(' ') || '' },
      mergeExistingContact: true,
      verifyEmail: true,
    }),
  });
  const signOnData = await safeJson(signOnRes);
  console.log('[checkout] sign-on status:', signOnRes.status, 'has sessionToken:', !!signOnData.sessionToken);
  if (!signOnRes.ok || !signOnData.sessionToken) return null;

  // Step 2: PKCE authorize with prompt=none (auto-redirects since user has session)
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = crypto.randomUUID();
  // Use the Wix site URL as redirect_uri (it must be registered in Wix OAuth app settings)
  const redirectUri = `https://www.wix.com/`;

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    scope: 'offline_access',
    redirect_uri: redirectUri,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    session_token: signOnData.sessionToken,
    prompt: 'none',
    state,
    response_mode: 'query',
  });

  const authRes = await fetch(`https://www.wixapis.com/oauth2/authorize?${params}`, { redirect: 'manual' });
  console.log('[checkout] auth redirect status:', authRes.status, 'location:', authRes.headers.get('location')?.slice(0, 100));

  if (authRes.status < 300 || authRes.status >= 400) return null;
  const location = authRes.headers.get('location');
  if (!location) return null;

  const locationUrl = new URL(location);
  const code = locationUrl.searchParams.get('code');
  const returnedState = locationUrl.searchParams.get('state');
  console.log('[checkout] got code:', !!code, 'state match:', returnedState === state);
  if (!code || returnedState !== state) return null;

  // Step 3: Exchange code for member tokens
  const tokenRes = await fetch('https://www.wixapis.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId,
      grantType: 'authorization_code',
      code,
      codeVerifier,
      redirectUri,
    }),
  });
  const tokenData = await safeJson(tokenRes);
  console.log('[checkout] token exchange status:', tokenRes.status, 'has access_token:', !!tokenData.access_token);
  if (!tokenRes.ok || !tokenData.access_token) return null;

  return { accessToken: tokenData.access_token, refreshToken: tokenData.refresh_token };
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
      const userFullName = body.userFullName || '';
      let memberTokens = null;
      if (userEmail && accessToken) {
        try {
          memberTokens = await getMemberTokens(accessToken, instanceId, clientId, userEmail, userFullName);
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
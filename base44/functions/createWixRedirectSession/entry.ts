// Generic wrapper around Wix's Create Redirect Session API.
// Used everywhere we hand the user off to a Wix-hosted flow.
// Docs: https://dev.wix.com/docs/rest/business-management/redirects/redirects/redirect-session/create-redirect-session
//
// Body: { flowType, params, callbacks }
//   flowType: 'ecomCheckout' | 'bookingsCheckout' | 'eventsCheckout' | 'tableReservationsCheckout' | 'paidPlansCheckout'
//   params:   the flow-specific object (e.g. { checkoutId } / { reservationId } / { eventSlug } / { slotAvailability, timezone })
//   callbacks (optional): { postFlowUrl, thankYouPageUrl, cartPageUrl }

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
    if (!clientId || !instanceId) {
      return Response.json({ error: "Missing Wix config" }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const { flowType, params = {}, callbacks = {} } = body;

    if (!flowType || !params) {
      return Response.json({ error: "Missing flowType or params" }, { status: 400 });
    }

    const accessToken = await getAnonToken(clientId);

    const referer = req.headers.get('referer') || '';
    const redirectSession = {
      [flowType]: params,
      callbacks: {
        postFlowUrl: callbacks.postFlowUrl || referer,
        ...(callbacks.thankYouPageUrl && { thankYouPageUrl: callbacks.thankYouPageUrl }),
        ...(callbacks.cartPageUrl && { cartPageUrl: callbacks.cartPageUrl }),
      },
    };

    const res = await fetch('https://www.wixapis.com/_api/redirects-api/v1/redirect-session', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'wix-site-id': instanceId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ redirectSession }),
    });

    const data = await safeJson(res);

    if (!res.ok) {
      console.error('[createWixRedirectSession] Failed:', JSON.stringify(data));
      return Response.json({
        error: data.message || 'Failed to create redirect session',
        details: data,
      }, { status: res.status });
    }

    return Response.json({
      redirectUrl: data.redirectSession?.fullUrl,
      sessionId: data.redirectSession?.id,
    });
  } catch (err) {
    console.error('[createWixRedirectSession] Error:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});
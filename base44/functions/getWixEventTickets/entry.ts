async function safeJson(res) {
  const text = await res.text();
  try { return text ? JSON.parse(text) : {}; } catch { return { _raw: text }; }
}

async function getAnonToken(clientId, clientSecret) {
  const res = await fetch("https://www.wixapis.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId, clientSecret, grantType: "client_credentials" }),
  });
  const data = await safeJson(res);
  if (!res.ok) throw new Error("Token error: " + JSON.stringify(data));
  return data.access_token;
}

Deno.serve(async (req) => {
  try {
    const clientId = Deno.env.get("WIX_CLIENT_ID");
    const clientSecret = Deno.env.get("WIX_CLIENT_SECRET");
    if (!clientId || !clientSecret) {
      return Response.json({ error: "Missing WIX credentials" }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const { eventId } = body;
    if (!eventId) return Response.json({ tickets: [] });

    const accessToken = await getAnonToken(clientId, clientSecret);
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'wix-site-id': clientId,
      'Content-Type': 'application/json',
    };

    const res = await fetch(`https://www.wixapis.com/events/v1/events/${eventId}/tickets`, {
      method: 'GET',
      headers,
    });
    const data = await safeJson(res);
    if (!res.ok) {
      console.error('[getWixEventTickets] Error:', data);
      return Response.json({ tickets: [] });
    }

    const tickets = (data.tickets || data.ticketDefinitions || []).map(t => ({
      id: t.id || t._id,
      name: t.name || t.title,
      description: t.description,
      price: parseFloat(t.price?.value || t.price?.amount || 0),
      currency: t.price?.currency || 'USD',
      available: t.limitPerCheckout > 0 || true,
      limit: t.limitPerCheckout || 10,
    }));

    return Response.json({ tickets });
  } catch (err) {
    console.error('[getWixEventTickets] Exception:', err.message);
    return Response.json({ error: err.message, tickets: [] }, { status: 500 });
  }
});
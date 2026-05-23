async function safeJson(res) {
  const text = await res.text();
  try { return text ? JSON.parse(text) : {}; } catch { return { _raw: text }; }
}

async function getAnonToken(clientId, clientSecret) {
  const res = await fetch("https://www.wixapis.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      clientId, 
      clientSecret,
      grantType: "client_credentials",
    }),
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
      return Response.json({ error: "Missing WIX_CLIENT_ID or WIX_CLIENT_SECRET" }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const { eventId } = body;

    const accessToken = await getAnonToken(clientId, clientSecret);
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'wix-site-id': clientId,
      'Content-Type': 'application/json',
    };

    let url = 'https://www.wixapis.com/events/v1/events?limit=50';
    if (eventId) {
      url = `https://www.wixapis.com/events/v1/events/${eventId}`;
    }

    const res = await fetch(url, { method: 'GET', headers });
    const data = await safeJson(res);

    if (!res.ok) {
      console.error('[getWixEvents] API error:', res.status, data);
      return Response.json({ events: [], event: null });
    }

    // Map event data - Wix Events uses 'scheduling' for dates
    const events = (data.events || []).map(e => {
      const sched = e.scheduling || {};
      const config = sched.config || {};
      return {
        id: e.id || e._id,
        name: e.title,
        description: e.description,
        startDate: config.startDate ? config.startDate.split('T')[0] : null,
        startTime: sched.startTimeFormatted || config.startTime,
        location: e.location?.name,
        image: e.mainImage?.url,
        price: e.ticketPricing?.price?.value || 0,
        currency: e.ticketPricing?.price?.currency || 'USD',
        availableTickets: e.ticketInventory?.availableTickets,
      };
    });

    if (eventId) {
      return Response.json({ event: events[0] || null, events: [] });
    }
    return Response.json({ events });
  } catch (err) {
    console.error('[getWixEvents] Error:', err.message);
    return Response.json({ error: err.message, events: [] }, { status: 500 });
  }
});
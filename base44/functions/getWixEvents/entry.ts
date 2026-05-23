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

function processEvent(event) {
  if (!event) return null;
  return {
    id: event._id || event.id,
    name: event.title || event.name,
    description: event.description,
    startDate: event.startDate || event.schedule?.startDate,
    endDate: event.endDate || event.schedule?.endDate,
    startTime: event.startTime || event.schedule?.startTime,
    location: event.location?.name || event.venue,
    image: event.mainImage?.url || event.image?.url || event.coverImage?.url,
    price: event.ticketPricing?.price?.value || event.price?.amount || 0,
    currency: event.ticketPricing?.price?.currency || 'USD',
    availableTickets: event.ticketInventory?.availableTickets || event.availableSeats,
  };
}

Deno.serve(async (req) => {
  try {
    const clientId = Deno.env.get("WIX_CLIENT_ID");
    const instanceId = Deno.env.get("WIX_INSTANCE_ID");
    if (!clientId || !instanceId) return Response.json({ error: "Missing config" }, { status: 500 });

    const body = await req.json().catch(() => ({}));
    const { eventId, limit = 50 } = body;

    const accessToken = await getAnonToken(clientId);
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'wix-site-id': instanceId,
      'Content-Type': 'application/json',
    };

    // Try Wix Events API
    let url = `https://www.wixapis.com/events/v1/events?limit=${limit}`;
    if (eventId) {
      url = `https://www.wixapis.com/events/v1/events/${eventId}`;
    }

    const res = await fetch(url, { method: 'GET', headers });
    const data = await safeJson(res);

    if (!res.ok) {
      console.error('[getWixEvents] Error:', JSON.stringify(data));
      return Response.json({ events: [], event: null });
    }

    // Handle both single event and list responses
    const events = data.events || (data.event ? [data.event] : []);
    const processed = events.map(processEvent);

    if (eventId) {
      return Response.json({ event: processed[0] || null, events: [] });
    }
    return Response.json({ events: processed });

  } catch (err) {
    console.error('[getWixEvents] Exception:', err.message);
    return Response.json({ error: err.message, events: [] }, { status: 500 });
  }
});
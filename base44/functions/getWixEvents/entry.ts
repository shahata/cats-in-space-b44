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
  
  // Extract date/time from various Wix Events API structures
  const schedule = event.schedule || event.eventSchedule || {};
  const startDate = event.startDate || schedule.startDate || event.time?.startDate;
  const startTime = event.startTime || schedule.startTime || (startDate ? startDate.substring(11, 16) : null);
  
  // Get image URL
  let image = null;
  if (event.mainImage?.url) image = event.mainImage.url;
  else if (event.image?.url) image = event.image.url;
  else if (event.coverImage?.url) image = event.coverImage.url;
  else if (event.media?.mainMedia?.image?.url) image = event.media.mainMedia.image.url;
  
  // Get pricing
  const pricing = event.ticketPricing?.price || event.price || {};
  
  return {
    id: event._id || event.id,
    name: event.title || event.name || 'Untitled Event',
    description: event.description || '',
    startDate: startDate,
    endDate: event.endDate || schedule.endDate,
    startTime: startTime,
    location: event.location?.name || event.venue || event.locationName || '',
    image: image,
    price: pricing.value || pricing.amount || 0,
    currency: pricing.currency || 'USD',
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

    console.log('[getWixEvents] Raw response keys:', Object.keys(data));
    if (data.events && data.events.length > 0) {
      console.log('[getWixEvents] First event structure:', JSON.stringify(data.events[0]).substring(0, 2000));
    }

    if (!res.ok) {
      console.error('[getWixEvents] Error:', res.status, JSON.stringify(data));
      return Response.json({ events: [], event: null });
    }

    // Handle both single event and list responses
    let events = [];
    if (data.events && Array.isArray(data.events)) {
      events = data.events;
    } else if (data.event) {
      events = [data.event];
    } else if (data.items && Array.isArray(data.items)) {
      events = data.items;
    }
    
    console.log('[getWixEvents] Found events:', events.length);
    const processed = events.map(processEvent).filter(Boolean);

    if (eventId) {
      return Response.json({ event: processed[0] || null, events: [] });
    }
    return Response.json({ events: processed });

  } catch (err) {
    console.error('[getWixEvents] Exception:', err.message);
    return Response.json({ error: err.message, events: [] }, { status: 500 });
  }
});
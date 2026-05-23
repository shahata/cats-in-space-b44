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

Deno.serve(async (req) => {
  try {
    const clientId = Deno.env.get("WIX_CLIENT_ID");
    const instanceId = Deno.env.get("WIX_INSTANCE_ID");
    if (!clientId || !instanceId) return Response.json({ error: "Missing config" }, { status: 500 });

    const body = await req.json().catch(() => ({}));
    const { serviceId, date } = body;

    if (!serviceId || !date) {
      return Response.json({ error: "serviceId and date required" }, { status: 400 });
    }

    const accessToken = await getAnonToken(clientId);
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'wix-site-id': instanceId,
      'Content-Type': 'application/json',
    };

    // Get available slots using Wix Schedule Slots API
    const res = await fetch('https://www.wixapis.com/bookings/v1/slots', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        serviceId,
        startDate: date,
        endDate: date,
      }),
    });

    const data = await safeJson(res);
    
    console.log('[getWixServiceSlots] Response status:', res.status);
    console.log('[getWixServiceSlots] Raw response:', JSON.stringify(data).substring(0, 1000));
    
    if (!res.ok) {
      console.error('[getWixServiceSlots] API Error:', res.status, JSON.stringify(data).substring(0, 200));
      return Response.json({ slots: [] });
    }

    // Extract time slots - handle various response structures
    let rawSlots = [];
    if (data.slots && Array.isArray(data.slots)) {
      rawSlots = data.slots;
    } else if (data.timeSlots && Array.isArray(data.timeSlots)) {
      rawSlots = data.timeSlots;
    } else if (data.availabilityEntries && Array.isArray(data.availabilityEntries)) {
      rawSlots = data.availabilityEntries;
    }

    const slots = rawSlots
      .filter(slot => slot.available !== false)
      .map(slot => ({
        startTime: slot.startTime?.localTime || slot.startTime || slot.time,
        endTime: slot.endTime?.localTime || slot.endTime,
        available: slot.available !== false,
      }));

    return Response.json({ slots });

  } catch (err) {
    console.error('[getWixServiceSlots] Exception:', err.message);
    return Response.json({ error: err.message, slots: [] }, { status: 500 });
  }
});
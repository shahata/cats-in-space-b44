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

    // Get available slots for a specific date
    const res = await fetch('https://www.wixapis.com/bookings/v1/availability/slots', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        serviceId,
        date: {
          year: parseInt(date.split('-')[0]),
          month: parseInt(date.split('-')[1]),
          day: parseInt(date.split('-')[2]),
        },
      }),
    });

    const data = await safeJson(res);
    if (!res.ok) {
      console.error('[getWixServiceSlots] Error:', JSON.stringify(data));
      return Response.json({ slots: [] });
    }

    // Extract time slots
    const slots = (data.timeSlots || data.slots || []).map(slot => ({
      startTime: slot.startTime?.localTime || slot.startTime,
      endTime: slot.endTime?.localTime || slot.endTime,
      available: slot.available !== false,
    }));

    return Response.json({ slots });

  } catch (err) {
    console.error('[getWixServiceSlots] Exception:', err.message);
    return Response.json({ error: err.message, slots: [] }, { status: 500 });
  }
});
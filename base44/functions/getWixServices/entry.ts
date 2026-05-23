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

function processService(service) {
  if (!service) return null;
  return {
    id: service._id || service.id,
    name: service.name || service.title,
    description: service.description,
    price: service.price?.value || service.price?.amount || 0,
    currency: service.price?.currency || 'USD',
    duration: service.duration || service.serviceDuration?.minutes || 60,
    image: service.image?.url || service.mainImage?.url || service.image,
    category: service.category || service.serviceType,
  };
}

Deno.serve(async (req) => {
  try {
    const clientId = Deno.env.get("WIX_CLIENT_ID");
    const instanceId = Deno.env.get("WIX_INSTANCE_ID");
    if (!clientId || !instanceId) return Response.json({ error: "Missing config" }, { status: 500 });

    const body = await req.json().catch(() => ({}));
    const { serviceId } = body;

    const accessToken = await getAnonToken(clientId);
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'wix-site-id': instanceId,
      'Content-Type': 'application/json',
    };

    // Try Wix Services API
    let url = 'https://www.wixapis.com/v1/bookings/services';
    if (serviceId) {
      url = `https://www.wixapis.com/v1/bookings/services/${serviceId}`;
    }

    const res = await fetch(url, { method: 'GET', headers });
    const data = await safeJson(res);

    if (!res.ok) {
      console.error('[getWixServices] Error:', JSON.stringify(data));
      return Response.json({ services: [], service: null });
    }

    // Handle both single service and list responses
    let services = [];
    if (data.services && Array.isArray(data.services)) {
      services = data.services;
    } else if (data.service) {
      services = [data.service];
    } else if (Array.isArray(data)) {
      services = data;
    } else if (data.items && Array.isArray(data.items)) {
      services = data.items;
    }
    const processed = services.map(processService).filter(s => s);

    if (serviceId) {
      return Response.json({ service: processed[0] || null, services: [] });
    }
    return Response.json({ services: processed });

  } catch (err) {
    console.error('[getWixServices] Exception:', err.message);
    return Response.json({ error: err.message, services: [] }, { status: 500 });
  }
});
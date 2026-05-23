async function safeJson(res) {
  const text = await res.text();
  try { return text ? JSON.parse(text) : {}; } catch { return { _raw: text }; }
}

async function getAccessToken(clientId, clientSecret) {
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

function processService(service) {
  if (!service) return null;
  
  // Extract image URL
  let imageUrl = null;
  if (service.media?.mainMedia?.image?.url) {
    imageUrl = service.media.mainMedia.image.url;
  } else if (service.image) {
    imageUrl = typeof service.image === 'string' ? service.image : service.image.url;
  }
  
  return {
    id: service._id || service.id,
    name: service.name || 'Untitled Service',
    description: service.description || '',
    price: service.price?.value || 0,
    currency: service.price?.currency || 'USD',
    duration: service.duration?.minutes || 60,
    image: imageUrl,
    category: service.category?.name || 'General',
  };
}

Deno.serve(async (req) => {
  try {
    const clientId = Deno.env.get("WIX_CLIENT_ID");
    const clientSecret = Deno.env.get("WIX_CLIENT_SECRET");
    
    if (!clientId || !clientSecret) {
      return Response.json({ error: "Missing WIX_CLIENT_ID or WIX_CLIENT_SECRET" }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const { serviceId } = body;

    const accessToken = await getAccessToken(clientId, clientSecret);
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'wix-site-id': clientId,
      'Content-Type': 'application/json',
    };

    let url, method, requestBody;
    
    if (serviceId) {
      url = `https://www.wixapis.com/bookings/v2/services/${serviceId}`;
      method = 'GET';
    } else {
      url = 'https://www.wixapis.com/bookings/v2/services/query';
      method = 'POST';
      requestBody = { query: { filter: {}, sort: [{ fieldName: 'name' }] } };
    }

    const res = await fetch(url, { 
      method, 
      headers,
      ...(requestBody && { body: JSON.stringify(requestBody) })
    });
    const data = await safeJson(res);

    if (!res.ok) {
      console.error('[getWixServices] Error:', res.status, data);
      return Response.json({ services: [], service: null });
    }

    let services = [];
    if (data.items && Array.isArray(data.items)) {
      services = data.items;
    } else if (data.services && Array.isArray(data.services)) {
      services = data.services;
    } else if (data.service) {
      services = [data.service];
    }
    
    const processed = services.map(processService).filter(s => s);

    if (serviceId) {
      return Response.json({ service: processed[0] || null, services: [] });
    }
    return Response.json({ services: processed });

  } catch (err) {
    console.error('[getWixServices] Error:', err.message);
    return Response.json({ error: err.message, services: [] }, { status: 500 });
  }
});
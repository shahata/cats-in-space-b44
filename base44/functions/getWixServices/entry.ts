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
  
  // Extract image URL from media.mainMedia.image (Wix Bookings v2 structure)
  let imageUrl = null;
  if (service.media?.mainMedia) {
    const mediaItem = service.media.mainMedia;
    // Image can be an object with id/url or a string
    if (typeof mediaItem.image === 'string') {
      const imageId = mediaItem.image;
      const cleanId = imageId.replace('wix:image://v1/', '').split('/')[0];
      imageUrl = `https://static.wixstatic.com/media/${cleanId}`;
    } else if (mediaItem.image?.id) {
      imageUrl = `https://static.wixstatic.com/media/${mediaItem.image.id}`;
    } else if (mediaItem.image?.url) {
      imageUrl = mediaItem.image.url;
    }
  }
  // Fallback to legacy image fields
  if (!imageUrl && service.image) {
    imageUrl = typeof service.image === 'string' 
      ? service.image 
      : service.image.url || service.image.imageUrl;
  }
  if (!imageUrl && service.mainImage?.url) {
    imageUrl = service.mainImage.url;
  }
  
  return {
    id: service._id || service.id,
    name: service.name || service.title || 'Untitled Service',
    description: service.description || '',
    price: service.price?.value || service.price?.amount || 0,
    currency: service.price?.currency || 'USD',
    duration: service.duration || service.serviceDuration?.minutes || 60,
    image: imageUrl,
    category: service.category?.name || service.category || service.serviceType || 'General',
  };
}

Deno.serve(async (req) => {
  try {
    const clientId = Deno.env.get("WIX_CLIENT_ID");
    const instanceId = Deno.env.get("WIX_INSTANCE_ID");
    if (!clientId || !instanceId) return Response.json({ error: "Missing config" }, { status: 500 });

    const reqBody = await req.json().catch(() => ({}));
    const { serviceId } = reqBody;

    const accessToken = await getAnonToken(clientId);
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'wix-site-id': instanceId,
      'Content-Type': 'application/json',
    };

    // Use Wix Bookings API - try v2 first, fallback to v1
    let url, requestBody, method;
    
    if (serviceId) {
      // Single service - use GET
      url = `https://www.wixapis.com/bookings/v2/services/${serviceId}`;
      method = 'GET';
    } else {
      // List services - use POST query
      url = 'https://www.wixapis.com/bookings/v2/services/query';
      method = 'POST';
      requestBody = {
        filter: {},
        sort: [{ fieldName: 'name' }],
        query: {
          filter: {},
          sort: [{ fieldName: 'name' }]
        }
      };
    }

    const res = await fetch(url, { 
      method, 
      headers,
      ...(requestBody && { body: JSON.stringify(requestBody) })
    });
    const data = await safeJson(res);

    if (!res.ok) {
      console.error('[getWixServices] Error:', JSON.stringify(data));
      return Response.json({ services: [], service: null });
    }

    // Handle v2 response structure
    let services = [];
    if (data.items && Array.isArray(data.items)) {
      services = data.items;
    } else if (data.services && Array.isArray(data.services)) {
      services = data.services;
    } else if (data.service) {
      services = [data.service];
    } else if (data.service && typeof data.service === 'object') {
      services = [data.service];
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
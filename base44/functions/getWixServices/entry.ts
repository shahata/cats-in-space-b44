import { createClient, OAuthStrategy } from 'npm:@wix/sdk@1.21.12';
import { services } from 'npm:@wix/bookings@1.0.1396';

function processService(service) {
  if (!service) return null;
  let priceValue = 0;
  let priceCurrency = 'USD';

  const sources = [service.price, service.priceData?.price, service.pricing?.price, service.rate, service.cost, service.payment?.rateLabel];
  for (const s of sources) {
    if (s?.value !== undefined) {
      priceValue = s.value;
      priceCurrency = s.currency || 'USD';
      break;
    }
  }

  let imageUrl = service.media?.mainMedia?.image?.url
    || service.media?.image?.url
    || service.image?.url
    || (typeof service.image === 'string' ? service.image : null);
  if (imageUrl && !imageUrl.startsWith('http')) {
    imageUrl = `https://static.wixstatic.com/media/${imageUrl}`;
  }

  return {
    id: service._id || service.id,
    name: service.name || 'Untitled Service',
    description: service.description || '',
    price: priceValue,
    currency: priceCurrency,
    duration: service.schedule?.availabilityConstraints?.sessionDurations?.[0] || service.duration?.minutes || 60,
    image: imageUrl,
    category: service.category?.name || 'General',
  };
}

Deno.serve(async (req) => {
  try {
    const clientId = Deno.env.get('WIX_CLIENT_ID');
    if (!clientId) return Response.json({ error: 'Missing WIX_CLIENT_ID' }, { status: 500 });

    const body = await req.json().catch(() => ({}));
    const { serviceId } = body;

    const wix = createClient({
      modules: { services },
      auth: OAuthStrategy({ clientId }),
    });

    if (serviceId) {
      try {
        const res = await wix.services.getService(serviceId);
        return Response.json({ service: processService(res.service || res), services: [] });
      } catch (e) {
        console.error('[getWixServices] getService:', e.message);
        return Response.json({ service: null, services: [] });
      }
    }

    const { items } = await wix.services.queryServices().find();
    const processed = (items || []).map(processService).filter(Boolean);

    return Response.json({ services: processed });
  } catch (err) {
    console.error('[getWixServices] Error:', err.message);
    return Response.json({ error: err.message, services: [] }, { status: 500 });
  }
});
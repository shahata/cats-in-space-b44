import { createClient, OAuthStrategy, media } from 'npm:@wix/sdk@1.21.12';
import { wixEventsV2 as wixEvents } from 'npm:@wix/events@1.0.764';

function toImageUrl(val) {
  if (!val) return null;
  const id = typeof val === 'string' ? val : (val?.url || val?.src?.url || val?.id);
  if (!id) return null;
  if (typeof id === 'string' && id.startsWith('http')) return id;
  try {
    return media.getImageUrl(id).url;
  } catch {
    return null;
  }
}

function mapEvent(e) {
  const sched = e.scheduling || {};
  const config = sched.config || {};
  const startISO = config.startDate || null;
  const tags = e.tags || e.categories || [];
  const tagNames = (Array.isArray(tags) ? tags : []).map(t => typeof t === 'string' ? t : (t.name || t.title)).filter(Boolean);
  const slug = e.slug || (e.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return {
    id: e._id || e.id,
    slug,
    name: e.title,
    description: e.description,
    startDateISO: startISO,
    startDate: startISO ? startISO.split('T')[0] : null,
    startTime: sched.startTimeFormatted || config.startTime,
    endDateISO: config.endDate || null,
    location: e.location?.name,
    image: toImageUrl(e.mainImage),
    price: e.ticketPricing?.price?.value || 0,
    currency: e.ticketPricing?.price?.currency || 'USD',
    availableTickets: e.ticketInventory?.availableTickets,
    tags: tagNames,
    about: e.about,
    recurringStatus: e.scheduling?.config?.recurringEvents?.length || 0,
  };
}

Deno.serve(async (req) => {
  try {
    const clientId = Deno.env.get('WIX_CLIENT_ID');
    if (!clientId) return Response.json({ error: 'Missing WIX_CLIENT_ID' }, { status: 500 });

    const body = await req.json().catch(() => ({}));
    const { eventId } = body;

    const wix = createClient({
      modules: { wixEvents },
      auth: OAuthStrategy({ clientId }),
    });

    if (eventId) {
      try {
        const res = await wix.wixEvents.getEvent(eventId);
        const ev = res.event || res;
        return Response.json({ event: ev ? mapEvent(ev) : null, events: [] });
      } catch (e) {
        console.error('[getWixEvents] getEvent:', e.message);
        return Response.json({ event: null, events: [] });
      }
    }

    const { items } = await wix.wixEvents.queryEvents().limit(50).find();
    return Response.json({ events: (items || []).map(mapEvent) });
  } catch (err) {
    console.error('[getWixEvents] Error:', err.message);
    return Response.json({ error: err.message, events: [] }, { status: 500 });
  }
});
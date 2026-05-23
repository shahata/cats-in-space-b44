import { createClient, OAuthStrategy } from 'npm:@wix/sdk@1.21.12';
import { ticketDefinitionsV2 as ticketDefinitions } from 'npm:@wix/events@1.0.764';

Deno.serve(async (req) => {
  try {
    const clientId = Deno.env.get('WIX_CLIENT_ID');
    if (!clientId) return Response.json({ error: 'Missing WIX_CLIENT_ID' }, { status: 500 });

    const body = await req.json().catch(() => ({}));
    const { eventId } = body;
    if (!eventId) return Response.json({ tickets: [] });

    const wix = createClient({
      modules: { ticketDefinitions },
      auth: OAuthStrategy({ clientId }),
    });

    const res = await wix.ticketDefinitions
      .queryTicketDefinitions()
      .eq('eventId', eventId)
      .find()
      .catch(e => { console.error('[getWixEventTickets] queryTicketDefinitions:', e.message); return { items: [] }; });

    const raw = res.items || [];
    const tickets = raw.map(t => ({
      id: t._id || t.id,
      name: t.name || t.title,
      description: t.description,
      price: parseFloat(t.price?.value || t.pricing?.fixedPrice?.value || t.price?.amount || 0),
      currency: t.price?.currency || t.pricing?.fixedPrice?.currency || 'USD',
      available: t.limitPerCheckout > 0 || true,
      limit: t.limitPerCheckout || 10,
    }));

    return Response.json({ tickets });
  } catch (err) {
    console.error('[getWixEventTickets] Exception:', err.message);
    return Response.json({ error: err.message, tickets: [] }, { status: 500 });
  }
});
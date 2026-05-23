import { createClient, OAuthStrategy } from 'npm:@wix/sdk@1.21.12';
import { availabilityCalendar } from 'npm:@wix/bookings@1.0.1396';

Deno.serve(async (req) => {
  try {
    const clientId = Deno.env.get('WIX_CLIENT_ID');
    if (!clientId) return Response.json({ error: 'Missing WIX_CLIENT_ID' }, { status: 500 });

    const body = await req.json().catch(() => ({}));
    const { serviceId, date } = body;
    if (!serviceId) return Response.json({ error: 'serviceId required' }, { status: 400 });

    const wix = createClient({
      modules: { availabilityCalendar },
      auth: OAuthStrategy({ clientId }),
    });

    const searchDate = date || new Date().toISOString().split('T')[0];
    const res = await wix.availabilityCalendar.queryAvailability({
      filter: {
        serviceId: [serviceId],
        startDate: `${searchDate}T00:00:00.000Z`,
        endDate: `${searchDate}T23:59:59.999Z`,
        bookable: true,
      },
    }, { timezone: 'UTC' }).catch(e => {
      console.error('[getWixServiceSlots] queryAvailability:', e.message);
      return { availabilityEntries: [] };
    });

    const entries = res.availabilityEntries || res.timeSlots || [];
    const slots = entries
      .filter(s => s.bookable !== false)
      .map(s => {
        const start = s.slot?.startDate || s.localStartDate || s.startTime;
        const end = s.slot?.endDate || s.localEndDate || s.endTime;
        return {
          startTime: start ? new Date(start).toISOString().substring(11, 16) : null,
          endTime: end ? new Date(end).toISOString().substring(11, 16) : null,
          available: s.bookable !== false,
        };
      })
      .filter(s => s.startTime);

    return Response.json({ slots });
  } catch (err) {
    console.error('[getWixServiceSlots] Exception:', err.message);
    return Response.json({ error: err.message, slots: [] }, { status: 500 });
  }
});
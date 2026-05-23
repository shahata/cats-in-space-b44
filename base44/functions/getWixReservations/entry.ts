import { createClient, OAuthStrategy } from 'npm:@wix/sdk@1.21.12';
import { timeSlots, reservations, reservationLocations, redirects } from 'npm:@wix/table-reservations@latest';

Deno.serve(async (req) => {
  try {
    const clientId = Deno.env.get('WIX_CLIENT_ID');
    if (!clientId) return Response.json({ error: 'Missing WIX_CLIENT_ID' }, { status: 500 });

    const body = await req.json().catch(() => ({}));
    const { action, date, partySize, reservationData } = body;

    const wix = createClient({
      modules: { timeSlots, reservations, reservationLocations, redirects },
      auth: OAuthStrategy({ clientId }),
    });

    if (action === 'getTimeSlots' && date && partySize) {
      const res = await wix.timeSlots.getTimeSlots({
        date: `${date}T00:00:00`,
        duration: 120,
        partySize,
        slotsBefore: 0,
        slotsAfter: 0,
      }).catch(e => { console.error('[getWixReservations] getTimeSlots:', e.message); return { timeSlots: [] }; });

      const slots = (res.timeSlots || []).map(s => ({
        startTime: s.startDate || s.startTime,
        endTime: s.endDate || s.endTime,
        availableTables: s.tableCombination?.tableIds?.length || s.availableTables,
        maxPartySize: s.maxPartySize,
      }));
      return Response.json({ slots });
    }

    if (action === 'createReservation' && reservationData) {
      try {
        const res = await wix.reservations.createReservation({
          reservation: {
            details: {
              startDate: reservationData.startDate,
              endDate: reservationData.endDate,
              partySize: reservationData.partySize,
            },
            reservee: {
              firstName: reservationData.firstName,
              lastName: reservationData.lastName,
              email: reservationData.email,
              phone: reservationData.phone,
            },
            additionalInfo: reservationData.notes ? { addedNote: reservationData.notes } : undefined,
          },
        });
        const r = res.reservation;
        const reservationId = r._id || r.id;

        let redirectUrl = null;
        try {
          const sessionRes = await wix.redirects.createRedirectSession({
            tableReservationsCheckout: { reservationId },
            callbacks: { postFlowUrl: req.headers.get('referer') || '' },
          });
          redirectUrl = sessionRes.redirectSession?.fullUrl;
        } catch (e) {
          console.error('[getWixReservations] createRedirectSession:', e.message);
        }

        return Response.json({
          reservation: {
            id: reservationId,
            status: r.status,
            startDate: r.details?.startDate,
            partySize: r.details?.partySize,
          },
          redirectUrl,
        });
      } catch (e) {
        console.error('[getWixReservations] createReservation:', e.message);
        return Response.json({ error: e.message || 'Failed to create reservation' }, { status: 400 });
      }
    }

    // Default: list locations
    const res = await wix.reservationLocations.listReservationLocations().catch(e => {
      console.error('[getWixReservations] listReservationLocations:', e.message);
      return { reservationLocations: [] };
    });
    const locations = (res.reservationLocations || res.locations || []).map(loc => ({
      id: loc._id || loc.id,
      name: loc.location?.name || loc.name,
      address: loc.location?.address?.formatted || loc.address?.formatted,
    }));
    return Response.json({ locations });
  } catch (err) {
    console.error('[getWixReservations] Error:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});
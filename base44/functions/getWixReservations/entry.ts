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

function processReservationLocation(location) {
  if (!location) return null;
  return {
    id: location._id || location.id,
    name: location.name,
    address: location.address,
    phone: location.phone,
    email: location.email,
    timezone: location.timezone,
  };
}

function processTimeSlot(slot) {
  if (!slot) return null;
  return {
    startTime: slot.startTime,
    endTime: slot.endTime,
    availableTables: slot.availableTables,
    maxPartySize: slot.maxPartySize,
    minPartySize: slot.minPartySize,
  };
}

function processReservation(reservation) {
  if (!reservation) return null;
  return {
    id: reservation._id || reservation.id,
    status: reservation.status, // RESERVED, REQUESTED, CANCELLED
    startDate: reservation.details?.startDate,
    endDate: reservation.details?.endDate,
    partySize: reservation.details?.partySize,
    tableIds: reservation.details?.tables?.ids,
    locationId: reservation.details?.reservationLocationId,
    reservee: {
      firstName: reservation.reservee?.firstName,
      lastName: reservation.reservee?.lastName,
      email: reservation.reservee?.email,
      phone: reservation.reservee?.phone,
    },
    notes: reservation.notes,
    createdDate: reservation.createdDate,
    updatedDate: reservation.updatedDate,
  };
}

Deno.serve(async (req) => {
  try {
    const clientId = Deno.env.get("WIX_CLIENT_ID");
    const instanceId = Deno.env.get("WIX_INSTANCE_ID");
    if (!clientId || !instanceId) return Response.json({ error: "Missing config" }, { status: 500 });

    const body = await req.json().catch(() => ({}));
    const { action, locationId, date, partySize, reservationId, reservationData } = body;

    const accessToken = await getAnonToken(clientId);
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'wix-site-id': instanceId,
      'Content-Type': 'application/json',
    };

    // Get reservation locations
    if (action === 'getLocations') {
      const res = await fetch('https://www.wixapis.com/table-reservations/v1/locations', { 
        method: 'GET', 
        headers 
      });
      const data = await safeJson(res);
      
      if (!res.ok) {
        return Response.json({ locations: [] });
      }
      
      const locations = (data.locations || []).map(processReservationLocation);
      return Response.json({ locations });
    }

    // Get available time slots
    if (action === 'getTimeSlots' && locationId && date && partySize) {
      const res = await fetch('https://www.wixapis.com/table-reservations/v1/time-slots/query', { 
        method: 'POST',
        headers,
        body: JSON.stringify({
          reservationLocationId: locationId,
          startDate: `${date}T00:00:00`,
          endDate: `${date}T23:59:59`,
          partySize,
        }),
      });
      const data = await safeJson(res);
      
      if (!res.ok) {
        return Response.json({ slots: [] });
      }
      
      const slots = (data.timeSlots || []).map(processTimeSlot);
      return Response.json({ slots });
    }

    // Create reservation
    if (action === 'createReservation' && reservationData) {
      const res = await fetch('https://www.wixapis.com/table-reservations/v1/reservations', { 
        method: 'POST',
        headers,
        body: JSON.stringify({
          reservation: {
            details: {
              reservationLocationId: reservationData.locationId,
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
            notes: reservationData.notes,
          },
        }),
      });
      const data = await safeJson(res);
      
      if (!res.ok) {
        return Response.json({ error: data.message || 'Failed to create reservation' }, { status: 400 });
      }
      
      const reservation = processReservation(data.reservation);
      return Response.json({ reservation });
    }

    // Get single reservation
    if (action === 'getReservation' && reservationId) {
      const res = await fetch(`https://www.wixapis.com/table-reservations/v1/reservations/${reservationId}`, { 
        method: 'GET', 
        headers 
      });
      const data = await safeJson(res);
      
      if (!res.ok) {
        return Response.json({ reservation: null });
      }
      
      const reservation = processReservation(data.reservation);
      return Response.json({ reservation });
    }

    // List reservations
    const res = await fetch('https://www.wixapis.com/table-reservations/v1/reservations/query', { 
      method: 'POST',
      headers,
      body: JSON.stringify({
        query: {
          limit: 50,
          sort: [{ fieldName: 'createdDate', order: 'DESC' }],
        },
      }),
    });
    const data = await safeJson(res);
    
    if (!res.ok) {
      return Response.json({ reservations: [] });
    }
    
    const reservations = (data.reservations || []).map(processReservation);
    return Response.json({ reservations });

  } catch (err) {
    console.error('[getWixReservations] Exception:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});
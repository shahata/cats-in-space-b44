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

Deno.serve(async (req) => {
  try {
    const clientId = Deno.env.get("WIX_CLIENT_ID");
    const clientSecret = Deno.env.get("WIX_CLIENT_SECRET");
    
    if (!clientId || !clientSecret) {
      return Response.json({ error: "Missing WIX_CLIENT_ID or WIX_CLIENT_SECRET" }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const { action, locationId, date, partySize, reservationData } = body;

    const accessToken = await getAccessToken(clientId, clientSecret);
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'wix-site-id': clientId,
      'Content-Type': 'application/json',
    };

    // Get available time slots
    if (action === 'getTimeSlots' && date && partySize) {
      const res = await fetch('https://www.wixapis.com/table-reservations/v1/time-slots/query', { 
        method: 'POST',
        headers,
        body: JSON.stringify({
          reservationDate: `${date}T00:00:00`,
          endDate: `${date}T23:59:59`,
          partySize,
        }),
      });
      const data = await safeJson(res);
      
      if (!res.ok) {
        return Response.json({ slots: [] });
      }
      
      const slots = (data.timeSlots || []).map(slot => ({
        startTime: slot.startTime,
        endTime: slot.endTime,
        availableTables: slot.availableTables,
        maxPartySize: slot.maxPartySize,
      }));

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
      
      const resData = data.reservation;
      const reservationId = resData._id;

      // Hand off to Wix's hosted reservation confirmation via the Create Redirect Session API.
      let redirectUrl = null;
      try {
        const sessionRes = await fetch('https://www.wixapis.com/_api/redirects-api/v1/redirect-session', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            redirectSession: {
              tableReservationsCheckout: { reservationId },
              callbacks: { postFlowUrl: req.headers.get('referer') || '' },
            },
          }),
        });
        const sessionData = await safeJson(sessionRes);
        if (sessionRes.ok && sessionData.redirectSession?.fullUrl) {
          redirectUrl = sessionData.redirectSession.fullUrl;
        } else {
          console.error('[getWixReservations] Redirect session failed:', JSON.stringify(sessionData));
        }
      } catch (e) {
        console.error('[getWixReservations] Redirect session error:', e.message);
      }

      return Response.json({ 
        reservation: {
          id: reservationId,
          status: resData.status,
          startDate: resData.details?.startDate,
          partySize: resData.details?.partySize,
        },
        redirectUrl,
      });
    }

    // Get locations (default)
    const res = await fetch('https://www.wixapis.com/table-reservations/v1/locations', { 
      method: 'GET', 
      headers 
    });
    const data = await safeJson(res);
    
    if (!res.ok) {
      return Response.json({ locations: [] });
    }
    
    const locations = (data.locations || []).map(loc => ({
      id: loc._id,
      name: loc.name,
      address: loc.address?.formatted,
    }));

    return Response.json({ locations });
  } catch (err) {
    console.error('[getWixReservations] Error:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});
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

function processBooking(booking) {
  if (!booking) return null;
  return {
    id: booking._id || booking.id,
    status: booking.status, // BOOKED, CONFIRMED, CANCELLED, etc.
    serviceId: booking.serviceId,
    serviceName: booking.serviceName,
    startDate: booking.startDate,
    endDate: booking.endDate,
    startTime: booking.startTime,
    endTime: booking.endTime,
    resourceId: booking.resourceId,
    resourceName: booking.resourceName,
    owner: {
      id: booking.owner?.id,
      name: booking.owner?.name,
      email: booking.owner?.email,
      phone: booking.owner?.phone,
    },
    paymentStatus: booking.paymentStatus, // PAID, PARTIALLY_PAID, UNPAID
    price: booking.price?.value || booking.price?.amount || 0,
    currency: booking.price?.currency || 'USD',
    attendanceStatus: booking.attendanceStatus, // ATTENDED, NO_SHOW, PENDING
    createdDate: booking.createdDate,
    updatedDate: booking.updatedDate,
  };
}

Deno.serve(async (req) => {
  try {
    const clientId = Deno.env.get("WIX_CLIENT_ID");
    const instanceId = Deno.env.get("WIX_INSTANCE_ID");
    if (!clientId || !instanceId) return Response.json({ error: "Missing config" }, { status: 500 });

    const body = await req.json().catch(() => ({}));
    const { bookingId, status, startDate, endDate, limit = 100 } = body;

    const accessToken = await getAnonToken(clientId);
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'wix-site-id': instanceId,
      'Content-Type': 'application/json',
    };

    let url, method, requestBody;

    if (bookingId) {
      // Get single booking
      url = `https://www.wixapis.com/bookings/v1/bookings/${bookingId}`;
      method = 'GET';
    } else {
      // List bookings with filters
      url = 'https://www.wixapis.com/bookings/v1/bookings/query';
      method = 'POST';
      requestBody = {
        query: {
          limit,
          sort: [{ fieldName: 'createdDate', order: 'DESC' }],
        },
        filter: {},
      };

      if (status) {
        requestBody.filter.status = status;
      }
      if (startDate || endDate) {
        requestBody.filter.startDate = {};
        if (startDate) requestBody.filter.startDate.$gte = startDate;
        if (endDate) requestBody.filter.endDate = {};
        if (endDate) requestBody.filter.endDate.$lte = endDate;
      }
    }

    const res = await fetch(url, { 
      method, 
      headers,
      ...(requestBody && { body: JSON.stringify(requestBody) })
    });
    const data = await safeJson(res);

    if (!res.ok) {
      console.error('[getWixBookings] Error:', JSON.stringify(data));
      return Response.json({ bookings: [], booking: null });
    }

    // Handle response structure
    let bookings = [];
    if (data.bookings && Array.isArray(data.bookings)) {
      bookings = data.bookings;
    } else if (data.booking) {
      bookings = [data.booking];
    }

    const processed = bookings.map(processBooking);

    if (bookingId) {
      return Response.json({ booking: processed[0] || null, bookings: [] });
    }
    return Response.json({ bookings: processed, totalCount: data.totalCount || processed.length });

  } catch (err) {
    console.error('[getWixBookings] Exception:', err.message);
    return Response.json({ error: err.message, bookings: [] }, { status: 500 });
  }
});
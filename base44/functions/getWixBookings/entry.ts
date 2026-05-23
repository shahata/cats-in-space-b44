import { createClient, OAuthStrategy } from 'npm:@wix/sdk@1.21.12';
import { extendedBookings } from 'npm:@wix/bookings@1.0.1396';

function processBooking(b) {
  if (!b) return null;
  const booking = b.booking || b;
  return {
    id: booking._id || booking.id,
    status: booking.status,
    serviceId: booking.bookedEntity?.serviceId || booking.serviceId,
    serviceName: booking.bookedEntity?.title || booking.serviceName,
    startDate: booking.startDate || booking.bookedEntity?.slot?.startDate,
    endDate: booking.endDate || booking.bookedEntity?.slot?.endDate,
    startTime: booking.startTime,
    endTime: booking.endTime,
    resourceId: booking.resourceId,
    resourceName: booking.resourceName,
    owner: {
      id: booking.contactDetails?.contactId || booking.owner?.id,
      name: booking.contactDetails?.firstName
        ? `${booking.contactDetails.firstName} ${booking.contactDetails.lastName || ''}`.trim()
        : booking.owner?.name,
      email: booking.contactDetails?.email || booking.owner?.email,
      phone: booking.contactDetails?.phone || booking.owner?.phone,
    },
    paymentStatus: booking.paymentStatus,
    price: booking.totalParticipants ? (booking.bookedEntity?.rate?.amount || 0) : 0,
    currency: booking.bookedEntity?.rate?.currency || 'USD',
    attendanceStatus: booking.attendanceStatus,
    createdDate: booking._createdDate || booking.createdDate,
    updatedDate: booking._updatedDate || booking.updatedDate,
  };
}

Deno.serve(async (req) => {
  try {
    const clientId = Deno.env.get('WIX_CLIENT_ID');
    if (!clientId) return Response.json({ error: 'Missing WIX_CLIENT_ID' }, { status: 500 });

    const body = await req.json().catch(() => ({}));
    const { bookingId, status, startDate, endDate, limit = 100 } = body;

    const wix = createClient({
      modules: { extendedBookings },
      auth: OAuthStrategy({ clientId }),
    });

    if (bookingId) {
      try {
        const res = await wix.extendedBookings.getExtendedBooking(bookingId);
        return Response.json({ booking: processBooking(res), bookings: [] });
      } catch (e) {
        console.error('[getWixBookings] getExtendedBooking:', e.message);
        return Response.json({ booking: null, bookings: [] });
      }
    }

    let query = wix.extendedBookings.queryExtendedBookings().limit(limit);
    if (status) query = query.eq('booking.status', status);
    if (startDate) query = query.ge('booking.startDate', startDate);
    if (endDate) query = query.le('booking.endDate', endDate);

    const res = await query.find().catch(e => {
      console.error('[getWixBookings] queryExtendedBookings:', e.message);
      return { items: [], totalCount: 0 };
    });

    const items = res.items || [];
    return Response.json({ bookings: items.map(processBooking), totalCount: res.totalCount || items.length });
  } catch (err) {
    console.error('[getWixBookings] Exception:', err.message);
    return Response.json({ error: err.message, bookings: [] }, { status: 500 });
  }
});
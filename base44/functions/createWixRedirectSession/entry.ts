// Generic wrapper around Wix's Create Redirect Session API.
// Body: { flowType, params, callbacks }
//   flowType: 'ecomCheckout' | 'bookingsCheckout' | 'eventsCheckout' | 'tableReservationsCheckout' | 'paidPlansCheckout'
import { createClient, OAuthStrategy } from 'npm:@wix/sdk@1.21.12';
import { redirects } from 'npm:@wix/redirects@latest';

Deno.serve(async (req) => {
  try {
    const clientId = Deno.env.get('WIX_CLIENT_ID');
    if (!clientId) return Response.json({ error: 'Missing WIX_CLIENT_ID' }, { status: 500 });

    const body = await req.json().catch(() => ({}));
    const { flowType, params = {}, callbacks = {} } = body;

    if (!flowType || !params) {
      return Response.json({ error: 'Missing flowType or params' }, { status: 400 });
    }

    const wix = createClient({
      modules: { redirects },
      auth: OAuthStrategy({ clientId }),
    });

    const referer = req.headers.get('referer') || '';
    const redirectSession = {
      [flowType]: params,
      callbacks: {
        postFlowUrl: callbacks.postFlowUrl || referer,
        ...(callbacks.thankYouPageUrl && { thankYouPageUrl: callbacks.thankYouPageUrl }),
        ...(callbacks.cartPageUrl && { cartPageUrl: callbacks.cartPageUrl }),
      },
    };

    const res = await wix.redirects.createRedirectSession(redirectSession);

    return Response.json({
      redirectUrl: res.redirectSession?.fullUrl,
      sessionId: res.redirectSession?.id,
    });
  } catch (err) {
    console.error('[createWixRedirectSession] Error:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});
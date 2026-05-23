import { createClient, OAuthStrategy } from 'npm:@wix/sdk@1.21.12';
import { checkout } from 'npm:@wix/ecom@1.0.2074';

Deno.serve(async (req) => {
  try {
    const clientId = Deno.env.get('WIX_CLIENT_ID');
    if (!clientId) return Response.json({ error: 'Missing WIX_CLIENT_ID' }, { status: 500 });

    const body = await req.json().catch(() => ({}));
    const { items = [], email = '', firstName = '', lastName = '' } = body;

    const wix = createClient({
      modules: { checkout },
      auth: OAuthStrategy({ clientId }),
    });

    const checkoutInfo = {
      lineItems: items.map(item => ({
        catalogReference: {
          catalogItemId: item.itemId,
          appId: '1380b703-ce81-ff05-7226-cd87d7d4b591',
          options: item.customizations ? { customizations: item.customizations } : undefined,
        },
        quantity: item.quantity || 1,
      })),
    };
    if (email) {
      checkoutInfo.buyerInfo = { email };
      checkoutInfo.billingInfo = { contactDetails: { firstName, lastName } };
    }

    const checkoutRes = await wix.checkout.createCheckout({ ...checkoutInfo, channelType: 'WEB' }).catch(e => {
      console.error('[createRestaurantOrder] create:', e.message);
      return null;
    });

    const checkoutId = checkoutRes?._id || checkoutRes?.id;
    if (!checkoutId) return Response.json({ error: 'Checkout creation failed' }, { status: 500 });

    const urlRes = await wix.checkout.getCheckoutUrl(checkoutId).catch(e => {
      console.error('[createRestaurantOrder] url:', e.message);
      return null;
    });

    if (!urlRes?.checkoutUrl) return Response.json({ error: 'Session creation failed' }, { status: 500 });

    return Response.json({
      checkoutId,
      sessionUrl: urlRes.checkoutUrl,
    });
  } catch (err) {
    console.error('[createRestaurantOrder] Exception:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});
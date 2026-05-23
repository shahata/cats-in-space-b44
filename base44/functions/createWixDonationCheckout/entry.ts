import { createClient, OAuthStrategy } from 'npm:@wix/sdk@1.21.12';
import { checkout } from 'npm:@wix/ecom@1.0.2074';

Deno.serve(async (req) => {
  try {
    const clientId = Deno.env.get('WIX_CLIENT_ID');
    if (!clientId) return Response.json({ error: 'Missing WIX_CLIENT_ID' }, { status: 500 });

    const body = await req.json().catch(() => ({}));
    const { amount, email = '', firstName = '', lastName = '' } = body;

    if (!amount || amount <= 0) return Response.json({ error: 'Invalid donation amount' }, { status: 400 });

    const wix = createClient({
      modules: { checkout },
      auth: OAuthStrategy({ clientId }),
    });

    const checkoutInfo = {
      customLineItems: [
        {
          itemType: { preset: 'PHYSICAL' },
          price: amount.toString(),
          productName: { original: 'Donation' },
          quantity: 1,
        },
      ],
    };
    if (email) {
      checkoutInfo.buyerInfo = { email };
      checkoutInfo.billingInfo = { contactDetails: { firstName, lastName } };
    }

    const checkoutRes = await wix.checkout.createCheckout({ ...checkoutInfo, channelType: 'WEB' }).catch(e => {
      console.error('[createWixDonationCheckout] create:', e?.message);
      return null;
    });

    const checkoutId = checkoutRes?._id || checkoutRes?.id;
    if (!checkoutId) return Response.json({ error: 'Checkout creation failed' }, { status: 500 });

    const urlRes = await wix.checkout.getCheckoutUrl(checkoutId).catch(e => {
      console.error('[createWixDonationCheckout] url:', e?.message);
      return null;
    });

    if (!urlRes?.checkoutUrl) return Response.json({ error: 'Session creation failed' }, { status: 500 });

    return Response.json({
      checkoutId,
      sessionUrl: urlRes.checkoutUrl,
    });
  } catch (err) {
    console.error('[createWixDonationCheckout] Exception:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});
// Session-aware cart using Wix's currentCart API.
// Frontend sends the full Wix tokens (member or visitor) from wixSession,
// the backend sets them on the OAuth client, and currentCart manages cart
// identity automatically — no manual cartId required.
import { createClient, OAuthStrategy } from 'npm:@wix/sdk@1.21.12';
import { currentCart, checkout } from 'npm:@wix/ecom@1.0.2074';

const WIX_STORES_APP_ID = '1380b703-ce81-ff05-f115-39571d94dfcd';

function buildClient(clientId, wixTokens) {
  return createClient({
    modules: { currentCart, checkout },
    auth: OAuthStrategy({ clientId, tokens: wixTokens }),
  });
}

function isCartNotFound(e) {
  const code = e?.details?.applicationError?.code || e?.message || '';
  return /OWNED_CART_NOT_FOUND|cart.*not.*found/i.test(code);
}

Deno.serve(async (req) => {
  try {
    const clientId = Deno.env.get('WIX_CLIENT_ID');
    if (!clientId) return Response.json({ error: 'Missing WIX_CLIENT_ID' }, { status: 500 });

    const body = await req.json().catch(() => ({}));
    const { action, wixTokens, productId, variantId, choices, lineItemId, quantity, postFlowUrl, userEmail, userFullName } = body;

    if (!wixTokens?.accessToken?.value) {
      return Response.json({ error: 'Missing Wix session tokens', cart: null });
    }

    const wix = buildClient(clientId, wixTokens);

    if (action === 'get') {
      try {
        const cart = await wix.currentCart.getCurrentCart();
        const first = cart?.lineItems?.[0];
        if (first) {
          console.log('[wixCart] line item keys:', Object.keys(first));
          console.log('[wixCart] first line item sample:', JSON.stringify(first).slice(0, 800));
        }
        return Response.json({ cart, cartId: cart?._id || null });
      } catch (e) {
        if (isCartNotFound(e)) return Response.json({ cart: null, cartId: null });
        console.error('[wixCart] get:', e.message);
        return Response.json({ cart: null, cartId: null });
      }
    }

    if (action === 'addItem') {
      // Wix Stores catalogReference accepts either a precomputed variantId
      // or a free-form { options: { OptionName: ChoiceValue } } map for
      // products that expose options without precomputed variants.
      const refOptions = variantId
        ? { variantId }
        : (choices && Object.keys(choices).length ? { options: choices } : null);
      const item = {
        catalogReference: {
          appId: WIX_STORES_APP_ID,
          catalogItemId: productId,
          ...(refOptions ? { options: refOptions } : {}),
        },
        quantity: quantity || 1,
      };
      console.log('[wixCart] addItem input:', JSON.stringify({ productId, variantId, choices }));
      console.log('[wixCart] addItem catalogReference:', JSON.stringify(item.catalogReference));
      try {
        const res = await wix.currentCart.addToCurrentCart({ lineItems: [item] });
        const cart = res?.cart || null;
        const added = cart?.lineItems?.find(li =>
          (li.catalogReference?.catalogItemId || li.productId) === productId
        );
        console.log('[wixCart] addItem -> line item catalogReference:', JSON.stringify(added?.catalogReference));
        return Response.json({ cart, cartId: cart?._id || null });
      } catch (e) {
        console.error('[wixCart] addItem failed:', e.message, e.details ? JSON.stringify(e.details) : '');
        return Response.json({ cart: null, cartId: null, error: e.message });
      }
    }

    if (action === 'removeItem') {
      const res = await wix.currentCart.removeLineItemsFromCurrentCart([lineItemId]).catch(e => {
        console.error('[wixCart] removeItem:', e.message);
        return null;
      });
      const cart = res?.cart || null;
      return Response.json({ cart, cartId: cart?._id || null });
    }

    if (action === 'updateItem') {
      if (!quantity || quantity <= 0) {
        const res = await wix.currentCart.removeLineItemsFromCurrentCart([lineItemId]).catch(e => {
          console.error('[wixCart] updateItem(remove):', e.message);
          return null;
        });
        const cart = res?.cart || null;
        return Response.json({ cart, cartId: cart?._id || null });
      }
      const res = await wix.currentCart.updateCurrentCartLineItemQuantity([
        { _id: lineItemId, quantity },
      ]).catch(e => {
        console.error('[wixCart] updateItem:', e.message);
        return null;
      });
      const cart = res?.cart || null;
      return Response.json({ cart, cartId: cart?._id || null });
    }

    if (action === 'createCheckout') {
      const checkoutRes = await wix.currentCart.createCheckoutFromCurrentCart({
        channelType: checkout.ChannelType.WEB,
      }).catch(e => {
        console.error('[wixCart] createCheckout:', e.message);
        return null;
      });
      if (!checkoutRes?.checkoutId) {
        return Response.json({ error: 'Could not create checkout', checkoutUrl: null });
      }
      const origin = postFlowUrl || '';
      const redirect = await wix.checkout.createRedirectSession({
        checkoutId: checkoutRes.checkoutId,
        callbacks: {
          postFlowUrl: origin,
          thankYouPageUrl: origin ? `${origin}/order-confirmation` : undefined,
        },
      }).catch(e => {
        console.error('[wixCart] redirect:', e.message);
        return null;
      });
      return Response.json({
        checkoutId: checkoutRes.checkoutId,
        checkoutUrl: redirect?.redirectSession?.fullUrl || null,
      });
    }

    return Response.json({ error: 'Invalid action' });
  } catch (err) {
    console.error('[wixCart] Exception:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});
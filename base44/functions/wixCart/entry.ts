// Session-aware cart using Wix's currentCart API.
// Frontend sends the full Wix tokens (member or visitor) from wixSession,
// the backend sets them on the OAuth client, and currentCart manages cart
// identity automatically — no manual cartId required.
import { createClient, OAuthStrategy } from 'npm:@wix/sdk@1.21.12';
import { currentCart, checkout } from 'npm:@wix/ecom@1.0.2074';
import { redirects } from 'npm:@wix/redirects@1.0.114';

// Wix Stores V3 appId — required when adding products fetched via productsV3.
// The legacy V1 appId (1380b703-...) will be silently accepted but Wix will
// not recognize variants from V3 products.
const WIX_STORES_APP_ID = '215238eb-22a5-4c36-9e7b-e7c08025e04e';

function buildClient(clientId, wixTokens) {
  return createClient({
    modules: { currentCart, checkout, redirects },
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
    const { action, wixTokens, productId, variantId, lineItemId, quantity, postFlowUrl, userEmail, userFullName } = body;

    if (!wixTokens?.accessToken?.value) {
      return Response.json({ error: 'Missing Wix session tokens', cart: null });
    }

    const wix = buildClient(clientId, wixTokens);

    if (action === 'get') {
      try {
        const cart = await wix.currentCart.getCurrentCart();
        return Response.json({ cart, cartId: cart?._id || null });
      } catch (e) {
        if (isCartNotFound(e)) return Response.json({ cart: null, cartId: null });
        console.error('[wixCart] get:', e.message);
        return Response.json({ cart: null, cartId: null });
      }
    }

    if (action === 'addItem') {
      // V3 cart requires a variantId; every V3 product has at least one
      // variant (the default), so this should always be present.
      const item = {
        catalogReference: {
          appId: WIX_STORES_APP_ID,
          catalogItemId: productId,
          ...(variantId ? { options: { variantId } } : {}),
        },
        quantity: quantity || 1,
      };
      console.log('[wixCart] addItem catalogReference:', JSON.stringify(item.catalogReference));
      try {
        const res = await wix.currentCart.addToCurrentCart({ lineItems: [item] });
        const cart = res?.cart || null;
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
      let redirect = null;
      let redirectError = null;

      // ─── DEBUG: intercept fetch to log the outgoing redirect call as curl ───
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (input, init = {}) => {
        const url = typeof input === 'string' ? input : input.url;
        const method = (init.method || (typeof input !== 'string' && input.method) || 'GET').toUpperCase();
        const headers = init.headers || (typeof input !== 'string' && input.headers) || {};
        const headerObj = {};
        if (headers instanceof Headers) {
          headers.forEach((v, k) => { headerObj[k] = v; });
        } else if (Array.isArray(headers)) {
          headers.forEach(([k, v]) => { headerObj[k] = v; });
        } else {
          Object.assign(headerObj, headers);
        }
        const body = init.body || null;

        if (/redirect-session|redirects/i.test(url)) {
          const headerArgs = Object.entries(headerObj)
            .map(([k, v]) => `  -H ${JSON.stringify(`${k}: ${v}`)}`)
            .join(' \\\n');
          const bodyArg = body ? ` \\\n  --data ${JSON.stringify(typeof body === 'string' ? body : JSON.stringify(body))}` : '';
          console.log('[wixCart] >>> CURL <<<\ncurl -X ' + method + ' ' + JSON.stringify(url) + ' \\\n' + headerArgs + bodyArg);
        }

        const res = await originalFetch(input, init);

        if (/redirect-session|redirects/i.test(url)) {
          const clone = res.clone();
          const text = await clone.text().catch(() => '');
          console.log('[wixCart] >>> RESPONSE <<<\nstatus:', res.status, '\nbody:', text);
        }
        return res;
      };

      try {
        redirect = await wix.redirects.createRedirectSession({
          ecomCheckout: { checkoutId: checkoutRes.checkoutId },
          callbacks: {
            postFlowUrl: origin,
            thankYouPageUrl: origin ? `${origin}/order-confirmation` : undefined,
          },
        });
      } catch (e) {
        redirectError = e?.message || String(e);
        const details = e?.details ? JSON.stringify(e.details) : '';
        console.error('[wixCart] redirect failed:', redirectError, details);
        if (details) redirectError = `${redirectError} | ${details}`;
      } finally {
        globalThis.fetch = originalFetch;
      }
      return Response.json({
        checkoutId: checkoutRes.checkoutId,
        checkoutUrl: redirect?.redirectSession?.fullUrl || null,
        error: redirect?.redirectSession?.fullUrl ? undefined : (redirectError || 'No redirect URL returned'),
      });
    }

    return Response.json({ error: 'Invalid action' });
  } catch (err) {
    console.error('[wixCart] Exception:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});
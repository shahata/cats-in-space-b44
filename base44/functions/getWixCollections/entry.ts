import { createClient, OAuthStrategy } from 'npm:@wix/sdk@1.21.12';
import { productsV3 } from 'npm:@wix/stores@1.0.786';

// V3 categories aren't exposed as a standalone SDK module yet,
// so we derive distinct categories from products.
Deno.serve(async () => {
  try {
    const clientId = Deno.env.get('WIX_CLIENT_ID');
    if (!clientId) return Response.json({ error: 'Missing WIX_CLIENT_ID' }, { status: 500 });

    const wix = createClient({
      modules: { productsV3 },
      auth: OAuthStrategy({ clientId }),
    });

    const res = await wix.productsV3.searchProducts({}).catch(e => {
      console.error('[getWixCollections] searchProducts:', e.message);
      return { products: [] };
    });

    const categoriesMap = new Map();
    (res.products || []).forEach(p => {
      (p.allCategoriesInfo?.categories || p.directCategoriesInfo?.categories || []).forEach(c => {
        const cid = c._id || c.id;
        if (cid && !categoriesMap.has(cid)) {
          categoriesMap.set(cid, {
            id: cid,
            name: c.name || c.slug || 'Category',
            slug: c.slug,
            productIds: [],
          });
        }
      });
    });

    return Response.json({ collections: Array.from(categoriesMap.values()) });
  } catch (err) {
    console.error('[getWixCollections] Exception:', err.message);
    return Response.json({ error: err.message, collections: [] }, { status: 500 });
  }
});
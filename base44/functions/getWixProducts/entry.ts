import { createClient, OAuthStrategy, media } from 'npm:@wix/sdk@1.21.12';
import { productsV3 } from 'npm:@wix/stores@1.0.786';

function mapProduct(p, processImg) {
  const pid = p._id || p.id;
  const minPrice = p.actualPriceRange?.minValue?.amount || p.actualPrice?.amount || 0;
  const currency = p.currency || 'USD';
  const formattedPrice = p.actualPriceRange?.minValue?.formattedAmount
    || p.actualPrice?.formattedAmount
    || (minPrice ? `${currency} ${minPrice}` : '');

  const v3Variants = p.variantsInfo?.variants || [];
  const variants = v3Variants.map(v => ({
    id: v._id || v.id,
    choices: (v.choices || []).reduce((acc, c) => {
      const oid = c.optionChoiceIds?.optionId || c.optionId;
      const cid = c.optionChoiceIds?.choiceId || c.choiceId;
      if (oid) acc[oid] = cid;
      return acc;
    }, {}),
    price: parseFloat(v.price?.actualPrice?.amount || minPrice),
    formattedPrice: v.price?.actualPrice?.formattedAmount || formattedPrice,
    currency,
    stock: v.inventoryStatus?.inStock !== false,
  }));

  const inStock = p.inventory?.availabilityStatus !== 'OUT_OF_STOCK';
  const hasVariants = variants.length > 0;

  const productCategories = (p.allCategoriesInfo?.categories || p.directCategoriesInfo?.categories || [])
    .map(c => ({ id: c._id || c.id, name: c.name || c.slug }))
    .filter(c => c.id);

  const options = (p.options || []).map(o => ({
    id: o._id || o.id || o.name,
    name: o.name,
    choices: (o.choicesSettings?.choices || []).map(c => ({
      id: c.choiceId || c._id || c.key || c.name,
      value: c.name || c.key,
      inStock: true,
    })),
  }));

  const mainImageRaw = p.media?.main?.image || p.media?.main?.url;
  const image = processImg(mainImageRaw);
  const gallery = (p.media?.itemsInfo?.items || [])
    .map(item => processImg(item.image || item.url))
    .filter(Boolean);

  return {
    id: pid,
    name: p.name,
    description: p.plainDescription || p.description || '',
    price: parseFloat(minPrice),
    formattedPrice,
    currency,
    image,
    gallery,
    wixId: pid,
    hasVariants,
    inStock,
    productOptions: options,
    variants,
    collections: productCategories,
    ribbon: p.ribbon?.name || null,
  };
}

function processWixImage(val, w = 800, h = 800) {
  if (!val) return '';
  const id = typeof val === 'string' ? val : (val?.url || val?.src?.url || val?.id);
  if (!id) return '';
  if (typeof id === 'string' && id.startsWith('http')) return id;
  try {
    return media.getScaledToFillImageUrl(id, w, h, {}).url || media.getImageUrl(id).url;
  } catch {
    return '';
  }
}

Deno.serve(async (req) => {
  try {
    const clientId = Deno.env.get('WIX_CLIENT_ID');
    if (!clientId) return Response.json({ error: 'Missing WIX_CLIENT_ID' }, { status: 500 });

    const body = await req.json().catch(() => ({}));
    const { productId } = body;

    const wix = createClient({
      modules: { productsV3 },
      auth: OAuthStrategy({ clientId }),
    });

    // Single product fetch — getProduct DOES return full variantsInfo (searchProducts does not).
    if (productId) {
      try {
        const res = await wix.productsV3.getProduct(productId);
        const p = res?.product || res;
        return Response.json({
          products: p ? [mapProduct(p, processWixImage)] : [],
          collections: [],
        });
      } catch (e) {
        console.error('[getWixProducts] getProduct:', e.message);
        return Response.json({ products: [], collections: [], error: e.message });
      }
    }

    const productsRes = await wix.productsV3.searchProducts({}).catch(e => {
      console.error('[getWixProducts] searchProducts:', e.message);
      return { products: [] };
    });

    const rawProducts = productsRes.products || productsRes.items || [];

    // Extract distinct categories from products (V3 doesn't expose categories via SDK)
    const categoriesMap = new Map();
    rawProducts.forEach(p => {
      (p.allCategoriesInfo?.categories || p.directCategoriesInfo?.categories || []).forEach(c => {
        const cid = c._id || c.id;
        if (cid && !categoriesMap.has(cid)) {
          categoriesMap.set(cid, { id: cid, name: c.name || c.slug || 'Category', slug: c.slug });
        }
      });
    });
    const collectionsList = Array.from(categoriesMap.values());

    const result = rawProducts.map(p => mapProduct(p, processWixImage));

    return Response.json({ products: result, collections: collectionsList });
  } catch (err) {
    console.error('[getWixProducts] Exception:', err.message);
    return Response.json({ error: err.message, products: [], collections: [] }, { status: 500 });
  }
});
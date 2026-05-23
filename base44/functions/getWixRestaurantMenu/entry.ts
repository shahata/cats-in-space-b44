import { createClient, OAuthStrategy, media } from 'npm:@wix/sdk@1.21.12';
import { items } from 'npm:@wix/restaurants@1.0.497';

function processWixImage(val, w = 600, h = 450) {
  if (!val) return null;
  const id = typeof val === 'string' ? val : (val?.url || val?.src?.url || val?.id);
  if (!id) return null;
  if (typeof id === 'string' && id.startsWith('http')) return id;
  try {
    return media.getScaledToFillImageUrl(id, w, h, {}).url || media.getImageUrl(id).url;
  } catch {
    return null;
  }
}

function processMenuItem(item) {
  if (!item) return null;
  return {
    id: item._id || item.id,
    name: item.name,
    description: item.description,
    price: parseFloat(item.priceInfo?.price || item.price?.amount || item.price?.value || 0),
    currency: item.priceInfo?.currency || item.price?.currency || 'USD',
    image: processWixImage(item.image),
    available: item.visible !== false,
  };
}

Deno.serve(async (req) => {
  try {
    const clientId = Deno.env.get('WIX_CLIENT_ID');
    if (!clientId) return Response.json({ error: 'Missing WIX_CLIENT_ID' }, { status: 500 });

    const wix = createClient({
      modules: { items },
      auth: OAuthStrategy({ clientId }),
    });

    const res = await wix.items.listItems().catch(e => {
      console.error('[getWixRestaurantMenu] listItems:', e?.message);
      return { items: [] };
    });

    const list = (res.items || []).map(processMenuItem).filter(Boolean);
    return Response.json({ items: list });
  } catch (err) {
    console.error('[getWixRestaurantMenu] Exception:', err.message);
    return Response.json({ error: err.message, items: [] }, { status: 500 });
  }
});
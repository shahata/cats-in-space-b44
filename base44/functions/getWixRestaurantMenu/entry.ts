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

function processMenuItem(item) {
  if (!item) return null;
  return {
    id: item._id || item.id,
    name: item.name || item.title,
    description: item.description,
    price: item.price?.value || item.price?.amount || 0,
    currency: item.price?.currency || 'USD',
    image: item.media?.url || item.image?.url || item.mainImage?.url,
    category: item.category || item.collectionId,
    available: item.inStock !== false,
  };
}

Deno.serve(async (req) => {
  try {
    const clientId = Deno.env.get("WIX_CLIENT_ID");
    const instanceId = Deno.env.get("WIX_INSTANCE_ID");
    if (!clientId || !instanceId) return Response.json({ error: "Missing config" }, { status: 500 });

    const body = await req.json().catch(() => ({}));
    const { categoryId } = body;

    const accessToken = await getAnonToken(clientId);
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'wix-site-id': instanceId,
      'Content-Type': 'application/json',
    };

    // Try Wix Restaurants API
    let url = 'https://www.wixapis.com/restaurants/v1/menu-items';
    if (categoryId) {
      url = `https://www.wixapis.com/restaurants/v1/menu-items?categoryId=${categoryId}`;
    }

    const res = await fetch(url, { method: 'GET', headers });
    const data = await safeJson(res);

    if (!res.ok) {
      console.error('[getWixRestaurantMenu] Error:', JSON.stringify(data));
      return Response.json({ items: [] });
    }

    const items = (data.items || data.menuItems || []).map(processMenuItem);
    return Response.json({ items });

  } catch (err) {
    console.error('[getWixRestaurantMenu] Exception:', err.message);
    return Response.json({ error: err.message, items: [] }, { status: 500 });
  }
});
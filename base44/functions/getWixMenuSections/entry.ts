async function safeJson(res) {
  const text = await res.text();
  try { return text ? JSON.parse(text) : {}; } catch { return { _raw: text }; }
}

async function getAccessToken(clientId, clientSecret) {
  const res = await fetch("https://www.wixapis.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      clientId, 
      clientSecret,
      grantType: "client_credentials",
    }),
  });
  const data = await safeJson(res);
  if (!res.ok) throw new Error("Token error: " + JSON.stringify(data));
  return data.access_token;
}

Deno.serve(async (req) => {
  try {
    const clientId = Deno.env.get("WIX_CLIENT_ID");
    const clientSecret = Deno.env.get("WIX_CLIENT_SECRET");
    
    if (!clientId || !clientSecret) {
      return Response.json({ error: "Missing WIX_CLIENT_ID or WIX_CLIENT_SECRET" }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const { includeItems = true } = body;

    const accessToken = await getAccessToken(clientId, clientSecret);
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'wix-site-id': clientId,
      'Content-Type': 'application/json',
    };

    // Fetch menu sections
    const sectionsRes = await fetch('https://www.wixapis.com/restaurants/v1/menu-sections', { 
      method: 'GET', 
      headers 
    });
    const sectionsData = await safeJson(sectionsRes);
    
    const sections = (sectionsData.sections || []).map(s => ({
      id: s._id || s.id,
      name: s.name || s.title,
      description: s.description,
      image: s.media?.image?.url,
    }));

    let items = [];
    if (includeItems) {
      // Fetch menu items
      const itemsRes = await fetch('https://www.wixapis.com/restaurants/v1/menu-items', { 
        method: 'GET', 
        headers 
      });
      const itemsData = await safeJson(itemsRes);
      
      items = (itemsData.items || []).map(item => ({
        id: item._id || item.id,
        name: item.name || item.title,
        description: item.description,
        price: item.price?.value || 0,
        currency: item.price?.currency || 'USD',
        image: item.media?.image?.url,
        categoryId: item.categoryId,
        available: item.inStock !== false,
      }));
    }

    // Build menu structure
    const menuStructure = sections.map(section => ({
      ...section,
      items: items.filter(item => item.categoryId === section.id),
    }));

    return Response.json({ 
      sections,
      items,
      menuStructure,
    });
  } catch (err) {
    console.error('[getWixMenuSections] Error:', err.message);
    return Response.json({ error: err.message, sections: [], items: [] }, { status: 500 });
  }
});
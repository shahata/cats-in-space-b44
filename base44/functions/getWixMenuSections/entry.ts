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

    // Query menus (not menu-sections)
    const menusRes = await fetch('https://www.wixapis.com/restaurants/menus-menu/v1/menus/query', { 
      method: 'POST',
      headers,
      body: JSON.stringify({ query: {} }),
    });
    const menusData = await safeJson(menusRes);
    
    const menus = (menusData.menus || []);
    
    if (menus.length === 0) {
      return Response.json({ 
        sections: [],
        items: [],
        menuStructure: [],
        menus: [],
      });
    }

    // Get the first menu's sections
    const menu = menus[0];
    const sectionIds = menu.sectionIds || [];
    
    // Query all sections
    const sectionsRes = await fetch('https://www.wixapis.com/restaurants/menus-section/v1/sections/query', { 
      method: 'POST',
      headers,
      body: JSON.stringify({ query: {} }),
    });
    const sectionsData = await safeJson(sectionsRes);
    
    const sections = (sectionsData.sections || [])
      .filter(s => sectionIds.includes(s.id))
      .map(s => ({
        id: s._id || s.id,
        name: s.name || s.title,
        description: s.description,
        image: s.additionalImages?.[0]?.url || s.image?.url,
        itemIds: s.itemIds || [],
      }));

    let items = [];
    if (includeItems) {
      // Query menu items
      const itemsRes = await fetch('https://www.wixapis.com/restaurants/menus-item/v1/items/query', { 
        method: 'POST',
        headers,
        body: JSON.stringify({ query: {} }),
      });
      const itemsData = await safeJson(itemsRes);
      
      items = (itemsData.items || []).map(item => ({
        id: item._id || item.id,
        name: item.name || item.title,
        description: item.description,
        price: item.price?.value || 0,
        currency: item.price?.currency || 'USD',
        image: item.media?.image?.url,
        categoryId: item.sectionId,
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
      menus,
    });
  } catch (err) {
    console.error('[getWixMenuSections] Error:', err.message);
    return Response.json({ error: err.message, sections: [], items: [] }, { status: 500 });
  }
});
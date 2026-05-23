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

function processMenuSection(section) {
  if (!section) return null;
  return {
    id: section._id || section.id,
    name: section.name || section.title,
    description: section.description,
    order: section.order || section.index,
    image: section.media?.url || section.image?.url,
    available: section.available !== false,
  };
}

function processMenuItem(item) {
  if (!item) return null;
  
  // Extract image URL properly
  let imageUrl = null;
  if (item.media?.mainMedia?.image) {
    const img = item.media.mainMedia.image;
    if (typeof img === 'string') {
      const cleanId = img.replace('wix:image://v1/', '').split('/')[0];
      imageUrl = `https://static.wixstatic.com/media/${cleanId}`;
    } else if (img.id) {
      imageUrl = `https://static.wixstatic.com/media/${img.id}`;
    } else if (img.url) {
      imageUrl = img.url;
    }
  }
  
  return {
    id: item._id || item.id,
    name: item.name || item.title,
    description: item.description,
    price: item.price?.value || item.price?.amount || 0,
    currency: item.price?.currency || 'USD',
    image: imageUrl,
    categoryId: item.categoryId,
    available: item.inStock !== false,
    labels: item.labels || [],
    variants: item.variants || [],
    modifierGroups: item.modifierGroups || [],
  };
}

Deno.serve(async (req) => {
  try {
    const clientId = Deno.env.get("WIX_CLIENT_ID");
    const instanceId = Deno.env.get("WIX_INSTANCE_ID");
    if (!clientId || !instanceId) return Response.json({ error: "Missing config" }, { status: 500 });

    const body = await req.json().catch(() => ({}));
    const { menuId, sectionId, includeItems = true } = body;

    const accessToken = await getAnonToken(clientId);
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'wix-site-id': instanceId,
      'Content-Type': 'application/json',
    };

    let sections = [];
    let items = [];

    // Fetch menu sections
    const sectionsRes = await fetch('https://www.wixapis.com/restaurants/v1/menu-sections', { 
      method: 'GET', 
      headers 
    });
    const sectionsData = await safeJson(sectionsRes);
    
    console.log('[getWixMenuSections] Sections response:', res.status, JSON.stringify(sectionsData).substring(0, 500));
    
    if (sectionsRes.ok) {
      sections = (sectionsData.sections || []).map(processMenuSection);
      console.log('[getWixMenuSections] Found sections:', sections.length);
    }

    // Fetch menu items
    if (includeItems) {
      const itemsRes = await fetch('https://www.wixapis.com/restaurants/v1/menu-items', { method: 'GET', headers });
      const itemsData = await safeJson(itemsRes);
      
      console.log('[getWixMenuSections] Items response:', itemsRes.status, JSON.stringify(itemsData).substring(0, 500));
      
      if (itemsRes.ok) {
        items = (itemsData.items || []).map(processMenuItem);
        console.log('[getWixMenuSections] Found items:', items.length);
      }
    }

    // Group items by section if menuId provided
    let menuStructure = null;
    if (menuId || !sectionId) {
      menuStructure = sections.map(section => ({
        ...section,
        items: items.filter(item => item.categoryId === section.id),
      }));
    }

    return Response.json({ 
      sections, 
      items,
      menuStructure,
    });

  } catch (err) {
    console.error('[getWixMenuSections] Exception:', err.message);
    return Response.json({ error: err.message, sections: [], items: [] }, { status: 500 });
  }
});
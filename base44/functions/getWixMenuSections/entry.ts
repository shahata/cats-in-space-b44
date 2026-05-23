import { createClient, OAuthStrategy, media } from 'npm:@wix/sdk@1.21.12';
import { menus, sections, items as menuItems } from 'npm:@wix/restaurants@1.0.497';

function toImageUrl(val, w, h) {
  if (!val) return null;
  const id = typeof val === 'string' ? val : (val?.url || val?.src?.url || val?.id);
  if (!id) return null;
  if (typeof id === 'string' && id.startsWith('http')) return id;
  try {
    if (w && h) return media.getScaledToFillImageUrl(id, w, h, {}).url;
    return media.getImageUrl(id).url;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  try {
    const clientId = Deno.env.get('WIX_CLIENT_ID');
    if (!clientId) return Response.json({ error: 'Missing WIX_CLIENT_ID' }, { status: 500 });

    const body = await req.json().catch(() => ({}));
    const { includeItems = true } = body;

    const wix = createClient({
      modules: { menus, sections, items: menuItems },
      auth: OAuthStrategy({ clientId }),
    });

    const menusRes = await wix.menus.queryMenus().find().catch(e => {
      console.error('[getWixMenuSections] queryMenus:', e.message);
      return { items: [] };
    });
    const menusList = menusRes.items || [];

    if (menusList.length === 0) {
      return Response.json({ sections: [], items: [], menuStructure: [], menus: [] });
    }

    const menu = menusList[0];
    const sectionIds = menu.sectionIds || [];

    const sectionsRes = await wix.sections.querySections().find().catch(e => {
      console.error('[getWixMenuSections] querySections:', e.message);
      return { items: [] };
    });

    const sectionsList = (sectionsRes.items || [])
      .filter(s => sectionIds.includes(s._id || s.id))
      .map(s => ({
        id: s._id || s.id,
        name: s.name || s.title,
        description: s.description,
        image: toImageUrl(s.additionalImages?.[0] || s.image),
        itemIds: s.itemIds || [],
      }));

    let itemsList = [];
    if (includeItems) {
      const itemsRes = await wix.items.queryItems().find().catch(e => {
        console.error('[getWixMenuSections] queryItems:', e.message);
        return { items: [] };
      });

      itemsList = (itemsRes.items || []).map(item => {
        let priceValue = 0;
        let priceCurrency = 'USD';
        const sources = [item.price, item.priceData?.price, item.pricing?.price, item.rate, item.cost];
        for (const s of sources) {
          if (s?.value !== undefined) { priceValue = s.value; priceCurrency = s.currency || 'USD'; break; }
        }

        const imageUrl = toImageUrl(
          item.media?.image || item.media?.mainMedia?.image || item.image,
          600,
          450
        );

        const labels = [];
        if (Array.isArray(item.labels)) item.labels.forEach(l => {
          const name = typeof l === 'string' ? l : (l.name || l.title || l.label);
          if (name) labels.push(name);
        });
        if (Array.isArray(item.labelIds)) labels.push(...item.labelIds);
        if (Array.isArray(item.dietaryLabels)) labels.push(...item.dietaryLabels);
        if (Array.isArray(item.allergens)) labels.push(...item.allergens);
        if (Array.isArray(item.tags)) labels.push(...item.tags);

        return {
          id: item._id || item.id,
          name: item.name || item.title,
          description: item.description,
          price: priceValue,
          currency: priceCurrency,
          image: imageUrl,
          categoryId: item.sectionId,
          available: item.inStock !== false,
          labels: [...new Set(labels)],
        };
      });
    }

    const menuStructure = sectionsList.map(section => ({
      ...section,
      items: itemsList.filter(item => item.categoryId === section.id),
    }));

    return Response.json({ sections: sectionsList, items: itemsList, menuStructure, menus: menusList });
  } catch (err) {
    console.error('[getWixMenuSections] Error:', err.message);
    return Response.json({ error: err.message, sections: [], items: [] }, { status: 500 });
  }
});
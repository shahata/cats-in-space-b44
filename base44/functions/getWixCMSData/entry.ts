import { createClient, OAuthStrategy } from 'npm:@wix/sdk@1.21.12';
import { items } from 'npm:@wix/data@latest';

function processWixImage(val, w = 600, h = 450) {
  if (!val) return null;
  const url = typeof val === 'string' ? val : (val?.url || val?.src?.url || '');
  if (!url) return null;
  if (url.startsWith('http')) return url;
  const match = url.match(/wix:image:\/\/v1\/([^/]+)\/(.*)/);
  if (match) return `https://static.wixstatic.com/media/${match[1]}/v1/fill/w_${w},h_${h},al_c,q_85,enc_auto/${match[2]}`;
  return null;
}

function processItem(item) {
  if (!item) return null;
  const isWrapped = item.data !== undefined && (item.id || item._id);
  const itemId = item._id || item.id;
  const d = isWrapped ? (item.data || {}) : item;
  const processed = { _id: itemId, ...d };

  for (const [key, val] of Object.entries(processed)) {
    if (!val) continue;
    if (typeof val === 'string' && val.startsWith('wix:image')) {
      processed[key] = processWixImage(val);
    } else if (val && typeof val === 'object' && !Array.isArray(val)) {
      if (val.data && (val._id || val.id)) processed[key] = processItem(val);
      else if (!val.data) {
        if (val.url && typeof val.url === 'string' && val.url.startsWith('wix:image')) processed[key] = processWixImage(val.url);
        else if (val.src?.url && typeof val.src.url === 'string' && val.src.url.startsWith('wix:image')) processed[key] = processWixImage(val.src.url);
      }
    } else if (Array.isArray(val)) {
      processed[key] = val.map(v => {
        if (v && typeof v === 'object' && v.data && (v._id || v.id)) return processItem(v);
        if (typeof v === 'string' && v.startsWith('wix:image')) return processWixImage(v);
        if (v && typeof v === 'object' && !v.data && (v._id || v.id)) return processItem({ _id: v._id || v.id, data: v });
        return v;
      });
    }
  }
  return processed;
}

Deno.serve(async (req) => {
  try {
    const clientId = Deno.env.get('WIX_CLIENT_ID');
    if (!clientId) return Response.json({ error: 'Missing WIX_CLIENT_ID' }, { status: 500 });

    const body = await req.json().catch(() => ({}));
    const { collectionId, slug, filter, sort, limit = 50, includeRefs = [] } = body;
    if (!collectionId) return Response.json({ error: 'collectionId required' }, { status: 400 });

    const wix = createClient({
      modules: { items },
      auth: OAuthStrategy({ clientId }),
    });

    let query = wix.items.query(collectionId).limit(slug ? 1 : limit);
    if (includeRefs.length > 0) {
      includeRefs.forEach(ref => { query = query.include(ref); });
    }
    if (slug) query = query.eq('slug', slug);
    if (filter) {
      for (const [k, v] of Object.entries(filter)) {
        if (typeof v === 'object' && v.$eq !== undefined) query = query.eq(k, v.$eq);
        else query = query.eq(k, v);
      }
    }
    if (sort) {
      sort.forEach(s => {
        if (s.order === 'DESC') query = query.descending(s.fieldName);
        else query = query.ascending(s.fieldName);
      });
    }

    const res = await query.find().catch(e => {
      console.error('[getWixCMSData] query:', e.message);
      return { items: [], totalCount: 0 };
    });

    const rawItems = res.items || [];
    const processed = rawItems.map(processItem);
    const total = res.totalCount || processed.length;

    if (slug) return Response.json({ item: processed[0] || null });
    return Response.json({ items: processed, total });
  } catch (err) {
    console.error('[getWixCMSData] Exception:', err.message);
    return Response.json({ error: err.message, items: [], total: 0 }, { status: 500 });
  }
});
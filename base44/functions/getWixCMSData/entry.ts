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
  // Handle both wrapped items (id + data) and flat items (direct fields)
  const isWrapped = item.data !== undefined && (item.id || item._id);
  const itemId = item.id || item._id;
  const d = isWrapped ? (item.data || {}) : item;
  const processed = { _id: itemId, ...d };
  
  for (const [key, val] of Object.entries(processed)) {
    if (!val) continue;
    // Handle string image URLs
    if (typeof val === 'string' && val.startsWith('wix:image')) {
      processed[key] = processWixImage(val);
    } 
    // Handle object with image URL
    else if (val && typeof val === 'object' && !Array.isArray(val)) {
      // Check if this is a wrapped item
      if (val.data && (val._id || val.id)) {
        processed[key] = processItem(val);
      } 
      // Check for image URL in url/src.url properties
      else if (!val.data) {
        if (val.url && typeof val.url === 'string' && val.url.startsWith('wix:image')) {
          processed[key] = processWixImage(val.url);
        } else if (val.src?.url && typeof val.src.url === 'string' && val.src.url.startsWith('wix:image')) {
          processed[key] = processWixImage(val.src.url);
        }
      }
    } 
    // Handle arrays (including referenced items arrays)
    else if (Array.isArray(val)) {
      processed[key] = val.map(v => {
        // If it's a wrapped item
        if (v && typeof v === 'object' && v.data && (v._id || v.id)) {
          return processItem(v);
        }
        // If it's a string image URL
        if (typeof v === 'string' && v.startsWith('wix:image')) {
          return processWixImage(v);
        }
        // If it's a plain object (flat referenced item), wrap and process
        if (v && typeof v === 'object' && !v.data && (v._id || v.id)) {
          const nested = { _id: v._id || v.id, data: v };
          return processItem(nested);
        }
        return v;
      });
    }
  }
  return processed;
}

Deno.serve(async (req) => {
  try {
    const clientId = Deno.env.get("WIX_CLIENT_ID");
    const instanceId = Deno.env.get("WIX_INSTANCE_ID");
    if (!clientId || !instanceId) return Response.json({ error: "Missing config" }, { status: 500 });

    const body = await req.json().catch(() => ({}));
    const { collectionId, slug, filter, sort, limit = 50, includeRefs = [] } = body;

    if (!collectionId) return Response.json({ error: "collectionId required" }, { status: 400 });

    const accessToken = await getAnonToken(clientId);
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'wix-site-id': instanceId,
      'Content-Type': 'application/json',
    };

    // Build query filter
    let queryFilter = filter || {};
    if (slug) {
      queryFilter = { slug: { $eq: slug } };
    }

    const queryBody = {
      dataCollectionId: collectionId,
      query: {
        paging: { limit: slug ? 1 : limit },
        ...(Object.keys(queryFilter).length > 0 ? { filter: queryFilter } : {}),
        ...(sort ? { sort } : {}),
      },
      ...(includeRefs.length > 0 ? { includeReferencedItems: includeRefs } : {}),
      returnTotalCount: true,
    };

    const res = await fetch('https://www.wixapis.com/wix-data/v2/items/query', {
      method: 'POST',
      headers,
      body: JSON.stringify(queryBody),
    });
    const data = await safeJson(res);

    if (!res.ok) {
      console.error(`[getWixCMSData] Error querying ${collectionId}:`, JSON.stringify(data));
      return Response.json({ error: data, items: [], total: 0 }, { status: res.status });
    }

    // Build a map of referenced items by their field name and ID (already processed)
    const refMap = {};
    if (data.referencedItems && typeof data.referencedItems === 'object') {
      for (const [fieldName, refItems] of Object.entries(data.referencedItems)) {
        refMap[fieldName] = {};
        (refItems || []).forEach(refItem => {
          const processed = processItem(refItem);
          refMap[fieldName][refItem.id] = processed;
        });
      }
    }

    // Process main items and merge in referenced items
    const items = (data.dataItems || []).map(item => {
      // First merge raw referenced item data into the item before processing
      const rawItem = { ...item };
      if (includeRefs.length > 0 && data.referencedItems) {
        includeRefs.forEach(refField => {
          const rawVal = rawItem.data?.[refField];
          if (rawVal && refMap[refField]) {
            // Replace IDs with full processed referenced items
            if (Array.isArray(rawVal)) {
              rawItem.data[refField] = rawVal.map(id => refMap[refField][id] || id);
            } else if (typeof rawVal === 'string' && refMap[refField][rawVal]) {
              rawItem.data[refField] = refMap[refField][rawVal];
            }
          }
        });
      }
      // Now process the item (including merged references)
      return processItem(rawItem);
    });
    const total = data.totalCount || items.length;

    if (slug) {
      return Response.json({ item: items[0] || null });
    }
    return Response.json({ items, total });

  } catch (err) {
    console.error('[getWixCMSData] Exception:', err.message);
    return Response.json({ error: err.message, items: [], total: 0 }, { status: 500 });
  }
});
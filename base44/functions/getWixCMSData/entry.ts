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
  const d = item.data || {};
  const processed = { _id: item.id, ...d };
  for (const [key, val] of Object.entries(processed)) {
    if (!val) continue;
    if (typeof val === 'string' && val.startsWith('wix:image')) {
      processed[key] = processWixImage(val);
    } else if (val && typeof val === 'object' && !Array.isArray(val)) {
      if (val.url && typeof val.url === 'string' && val.url.startsWith('wix:image')) {
        processed[key] = processWixImage(val.url);
      } else if (val.src?.url && typeof val.src.url === 'string' && val.src.url.startsWith('wix:image')) {
        processed[key] = processWixImage(val.src.url);
      }
    } else if (Array.isArray(val)) {
      // handle array of references that might have been resolved
      processed[key] = val.map(v => {
        if (v && typeof v === 'object' && v.data) return processItem(v);
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

    const items = (data.dataItems || []).map(item => processItem(item));
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
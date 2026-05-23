async function safeJson(res) {
  const text = await res.text();
  try { return text ? JSON.parse(text) : {}; } catch { return { _raw: text }; }
}

async function getAccessToken(clientId, clientSecret) {
  const res = await fetch("https://www.wixapis.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId, clientSecret, grantType: "client_credentials" }),
  });
  const data = await safeJson(res);
  if (!res.ok) throw new Error("Token error: " + JSON.stringify(data));
  return data.access_token;
}

Deno.serve(async (req) => {
  try {
    const clientId = Deno.env.get("WIX_CLIENT_ID");
    const clientSecret = Deno.env.get("WIX_CLIENT_SECRET");
    const instanceId = Deno.env.get("WIX_INSTANCE_ID") || clientId;
    if (!clientId || !clientSecret) {
      return Response.json({ error: "Missing Wix credentials" }, { status: 500 });
    }

    const accessToken = await getAccessToken(clientId, clientSecret);
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'wix-site-id': instanceId,
      'Content-Type': 'application/json',
    };

    const res = await fetch('https://www.wixapis.com/stores-reader/v1/collections/query', {
      method: 'POST',
      headers,
      body: JSON.stringify({ query: {} }),
    });
    const data = await safeJson(res);
    if (!res.ok) {
      console.error('[getWixCollections] Error:', data);
      return Response.json({ collections: [] });
    }

    const collections = (data.collections || []).map(c => ({
      id: c.id || c._id,
      name: c.name,
      slug: c.slug,
      productIds: c.productIds || [],
    }));

    return Response.json({ collections });
  } catch (err) {
    console.error('[getWixCollections] Exception:', err.message);
    return Response.json({ error: err.message, collections: [] }, { status: 500 });
  }
});
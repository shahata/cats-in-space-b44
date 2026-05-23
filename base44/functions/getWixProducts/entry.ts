import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function getWixAccessToken(clientId) {
  const tokenResponse = await fetch("https://www.wixapis.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clientId: clientId,
      grantType: "anonymous",
    }),
  });

  const tokenData = await tokenResponse.json();
  if (!tokenResponse.ok) {
    throw new Error("Failed to get Wix access token: " + JSON.stringify(tokenData));
  }
  return tokenData.access_token;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const clientId = Deno.env.get("WIX_CLIENT_ID");
    const instanceId = Deno.env.get("WIX_INSTANCE_ID");

    if (!clientId || !instanceId) {
      return Response.json({ error: "Missing Wix credentials" }, { status: 500 });
    }

    const accessToken = await getWixAccessToken(clientId);

    const productsResponse = await fetch("https://www.wixapis.com/stores/v3/products/query", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "wix-site-id": instanceId,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        cursorPaging: { limit: 100 },
      }),
    });

    const productsData = await productsResponse.json();

    if (!productsResponse.ok) {
      return Response.json({ error: productsData }, { status: productsResponse.status });
    }

    const products = (productsData.products || []).map(p => ({
      id: p.id,
      name: p.name,
      description: p.description || "",
      price: parseFloat(p.actualPriceRange?.minValue?.amount || 0),
      image: p.media?.main?.image?.url || "",
      wixId: p.id,
    }));

    return Response.json({ products });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
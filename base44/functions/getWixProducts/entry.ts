import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const clientId = Deno.env.get("WIX_CLIENT_ID");
    const clientSecret = Deno.env.get("WIX_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      return Response.json({ error: "Missing Wix credentials" }, { status: 500 });
    }

    // Get access token
    const tokenResponse = await fetch("https://www.wixapis.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) {
      return Response.json({ error: "Failed to get access token" }, { status: 500 });
    }

    const accessToken = tokenData.access_token;

    // Query products
    const productsResponse = await fetch("https://www.wixapis.com/stores/v3/products/query", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        cursorPaging: { limit: 100 },
        fields: ["URL", "CURRENCY", "MEDIA_ITEMS_INFO"],
      }),
    });

    const productsData = await productsResponse.json();

    if (!productsResponse.ok) {
      return Response.json({ error: productsData }, { status: productsResponse.status });
    }

    // Transform products to match our format
    const products = (productsData.products || []).map(p => ({
      id: p.id,
      name: p.name,
      description: p.description || "",
      price: p.priceData?.formatted?.price ? parseFloat(p.priceData.formatted.price) : 0,
      image: p.media?.items?.[0]?.url || "",
      wixId: p.id,
    }));

    return Response.json({ products });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
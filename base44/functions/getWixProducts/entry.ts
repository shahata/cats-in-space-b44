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

    const headers = {
      "Authorization": `Bearer ${accessToken}`,
      "wix-site-id": instanceId,
      "Content-Type": "application/json",
    };

    const [productsResponse, collectionsResponse] = await Promise.all([
      fetch("https://www.wixapis.com/stores-reader/v1/products/query", {
        method: "POST",
        headers,
        body: JSON.stringify({ includeVariants: true }),
      }),
      fetch("https://www.wixapis.com/stores-reader/v1/collections/query", {
        method: "POST",
        headers,
        body: JSON.stringify({ query: {} }),
      }),
    ]);

    const productsData = await productsResponse.json();
    const collectionsData = await collectionsResponse.json().catch(() => ({}));

    if (!productsResponse.ok) {
      return Response.json({ error: productsData }, { status: productsResponse.status });
    }

    const collections = (collectionsData.collections || []).map(c => ({
      id: c.id || c._id,
      name: c.name,
      slug: c.slug,
    }));

    const productCollectionsMap = {};
    (collectionsData.collections || []).forEach(c => {
      (c.productIds || []).forEach(pid => {
        if (!productCollectionsMap[pid]) productCollectionsMap[pid] = [];
        productCollectionsMap[pid].push({ id: c.id || c._id, name: c.name });
      });
    });

    const products = (productsData.products || []).map(p => {
      const options = p.productOptions || [];
      const variants = (p.variants || []).map(v => {
        const variantPrice = parseFloat(v.variant?.priceData?.price || p.priceData?.price || 0);
        const currency = p.priceData?.currency || '';
        const formatted = v.variant?.priceData?.formatted?.price || '';
        return {
          id: v.id,
          choices: v.choices || {},
          price: variantPrice,
          formattedPrice: formatted,
          currency,
          stock: v.stock?.inStock !== false,
        };
      });
      const inStock = p.stock?.inStock !== false;
      const hasVariants = p.manageVariants === true && variants.length > 0;
      const productCollections = productCollectionsMap[p.id] || [];
      return {
        id: p.id,
        name: p.name,
        description: p.description || "",
        price: parseFloat(p.priceData?.price || p.price?.price || 0),
        formattedPrice: p.priceData?.formatted?.price || p.priceData?.formatted?.discountedPrice || "",
        currency: p.priceData?.currency || "",
        image: p.media?.mainMedia?.image?.url || p.media?.main?.image?.url || "",
        gallery: (p.media?.items || []).map(item => item.image?.url || item.thumbnail?.url).filter(Boolean),
        wixId: p.id,
        hasVariants,
        inStock,
        productOptions: options.map(o => ({
          name: o.name,
          choices: (o.choices || []).filter(c => c.visible !== false).map(c => ({
            value: c.value || c.description,
            inStock: c.inStock !== false,
          })),
        })),
        variants,
        collections: productCollections,
        ribbon: p.ribbon || (p.stock?.inventoryStatus === 'PRE_ORDER' ? 'Pre-Order' : null),
      };
    });

    return Response.json({ products, collections });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
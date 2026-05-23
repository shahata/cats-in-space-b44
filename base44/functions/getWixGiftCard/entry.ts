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

    // Wix Stores represents gift cards as regular products with productType="giftCard".
    const res = await fetch('https://www.wixapis.com/stores-reader/v1/products/query', {
      method: 'POST',
      headers,
      body: JSON.stringify({ includeVariants: true }),
    });
    const data = await safeJson(res);

    const defaultAmounts = [25, 50, 100, 150, 200];
    const defaultImage = 'https://media.base44.com/images/public/6a115eeb3c3d127dbcd0a2fe/4c1c3f124_generated_image.png';
    let amounts = defaultAmounts;
    let currency = 'ILS';
    let name = 'eGift Card';
    let description = "You can't go wrong with a gift card. Choose an amount and write a personalized message to make this gift your own.";
    let image = defaultImage;

    const giftProduct = (data.products || []).find(p => p.productType === 'giftCard');
    if (giftProduct) {
      name = giftProduct.name || name;
      description = giftProduct.description || description;
      image = giftProduct.media?.mainMedia?.image?.url || defaultImage;
      currency = giftProduct.priceData?.currency || currency;
      if (giftProduct.variants?.length) {
        const variantPrices = giftProduct.variants
          .map(v => parseFloat(v.variant?.priceData?.price || 0))
          .filter(p => p > 0);
        if (variantPrices.length) amounts = variantPrices;
      }
    }

    return Response.json({
      giftCard: {
        name,
        description,
        image,
        amounts,
        currency,
        allowCustom: true,
      },
    });
  } catch (err) {
    console.error('[getWixGiftCard] Exception:', err.message);
    return Response.json({
      giftCard: {
        name: 'eGift Card',
        description: "You can't go wrong with a gift card. Choose an amount.",
        amounts: [25, 50, 100, 150, 200],
        currency: 'ILS',
        allowCustom: true,
      },
    });
  }
});
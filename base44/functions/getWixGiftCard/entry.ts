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

    // Try the Gift Vouchers / Gift Cards API
    const res = await fetch('https://www.wixapis.com/gift-voucher/v1/products', {
      method: 'GET',
      headers,
    });
    const data = await safeJson(res);

    // Default amounts if API doesn't return product
    const defaultAmounts = [25, 50, 100, 150, 200];
    let amounts = defaultAmounts;
    let currency = 'ILS';
    let name = 'eGift Card';
    let image = null;

    if (res.ok && data.products?.[0]) {
      const product = data.products[0];
      name = product.name || name;
      image = product.media?.mainMedia?.image?.url || product.image?.url || null;
      if (product.variants?.length) {
        amounts = product.variants.map(v => parseFloat(v.price?.value || 0)).filter(Boolean);
        currency = product.variants[0]?.price?.currency || currency;
      }
    }

    return Response.json({
      giftCard: {
        name,
        description: "You can't go wrong with a gift card. Choose an amount and write a personalized message to make this gift your own.",
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
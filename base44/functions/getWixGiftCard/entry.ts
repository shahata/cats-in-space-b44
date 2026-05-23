async function safeJson(res) {
  const text = await res.text();
  try { return text ? JSON.parse(text) : {}; } catch { return { _raw: text }; }
}

async function getAccessToken(clientId) {
  const res = await fetch('https://www.wixapis.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId, grantType: 'anonymous' }),
  });
  const data = await safeJson(res);
  if (!res.ok) throw new Error('Token error: ' + JSON.stringify(data));
  return data.access_token;
}

Deno.serve(async (req) => {
  try {
    const clientId = Deno.env.get('WIX_CLIENT_ID');
    const siteId = Deno.env.get('WIX_SITE_ID') || Deno.env.get('WIX_INSTANCE_ID');
    if (!clientId) return Response.json({ error: 'Missing WIX_CLIENT_ID' }, { status: 500 });

    const accessToken = await getAccessToken(clientId);
    const headers = {
      'Content-Type': 'application/json',
      Authorization: accessToken,
      'wix-site-id': siteId,
    };

    const res = await fetch('https://www.wixapis.com/gift-cards/v1/gift-card-products/query', {
      method: 'POST',
      headers,
      body: JSON.stringify({ query: {} }),
    });
    const data = await safeJson(res);
    const product = (data.giftCardProducts || [])[0];

    if (!product) {
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

    const variants = (product.presetVariants || []).map(v => ({
      id: v.id,
      price: parseFloat(v.price?.amount || 0),
      value: parseFloat(v.value?.amount || v.price?.amount || 0),
      image: v.image?.url || null,
    })).filter(v => v.value > 0);

    return Response.json({
      giftCard: {
        id: product.id,
        name: product.name || 'eGift Card',
        description: product.description || '',
        image: product.image?.url || null,
        amounts: variants.map(v => v.value),
        variants,
        currency: 'ILS',
        allowCustom: !!product.customValue?.enabled || true,
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
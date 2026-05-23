import { createClient, OAuthStrategy, media } from 'npm:@wix/sdk@1.21.12';
import { giftCardProducts } from 'npm:@wix/gift-vouchers@1.0.76';

function toImageUrl(val) {
  if (!val) return null;
  const id = typeof val === 'string' ? val : (val?.url || val?.src?.url || val?.id);
  if (!id) return null;
  if (typeof id === 'string' && id.startsWith('http')) return id;
  try {
    return media.getImageUrl(id).url;
  } catch {
    return null;
  }
}

Deno.serve(async () => {
  try {
    const clientId = Deno.env.get('WIX_CLIENT_ID');
    if (!clientId) return Response.json({ error: 'Missing WIX_CLIENT_ID' }, { status: 500 });

    const wix = createClient({
      modules: { giftCardProducts },
      auth: OAuthStrategy({ clientId }),
    });

    const { items } = await wix.giftCardProducts.queryGiftCardProducts().find();
    const product = items?.[0];

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
      image: toImageUrl(v.image),
    })).filter(v => v.value > 0);

    return Response.json({
      giftCard: {
        id: product.id,
        name: product.name || 'eGift Card',
        description: product.description || '',
        image: toImageUrl(product.image),
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
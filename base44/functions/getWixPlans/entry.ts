import { createClient, OAuthStrategy } from 'npm:@wix/sdk@1.21.12';
import { plans } from 'npm:@wix/pricing-plans@latest';

function processPlan(plan) {
  if (!plan) return null;
  const primaryPrice = plan.pricing?.price?.value || plan.price?.value || plan.price?.amount || 0;
  const currency = plan.pricing?.price?.currency || plan.currency || 'USD';
  const priceDisplay = primaryPrice === 0 ? 'Free' : `${currency}${primaryPrice}`;
  const perks = (plan.perks?.values || plan.benefits || plan.perks || []).map(b => ({
    label: typeof b === 'string' ? b : (b.name || b.description || 'Benefit'),
    value: typeof b === 'string' ? '' : (b.description || b.name || ''),
  }));

  return {
    id: plan._id || plan.id,
    name: plan.name,
    description: plan.description,
    priceDisplay,
    price: primaryPrice,
    currency,
    period: plan.pricing?.subscription?.cycleDuration?.unit || plan.frequency?.unit || 'month',
    hasFreeTrial: !!plan.pricing?.freeTrialDays || !!plan.trialPeriod?.duration,
    freeTrialDays: plan.pricing?.freeTrialDays || plan.trialPeriod?.duration || 0,
    perks,
    highlighted: false,
  };
}

Deno.serve(async () => {
  try {
    const clientId = Deno.env.get('WIX_CLIENT_ID');
    if (!clientId) return Response.json({ error: 'Missing WIX_CLIENT_ID' }, { status: 500 });

    const wix = createClient({
      modules: { plans },
      auth: OAuthStrategy({ clientId }),
    });

    const res = await wix.plans.listPublicPlans().catch(e => {
      console.error('[getWixPlans] listPublicPlans:', e.message);
      return { plans: [] };
    });
    const list = (res.plans || []).map(processPlan).filter(Boolean);

    return Response.json({ plans: list });
  } catch (err) {
    console.error('[getWixPlans] Exception:', err.message);
    return Response.json({ error: err.message, plans: [] }, { status: 500 });
  }
});
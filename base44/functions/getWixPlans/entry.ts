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

function transformPlan(plan) {
  const pricing = plan.pricing;
  let priceDisplay = 'Free';
  let period = null;
  let isFree = true;

  if (pricing?.singlePaymentForDuration) {
    const p = pricing.singlePaymentForDuration;
    priceDisplay = `${p.price?.currency || ''} ${p.price?.value || '0'}`;
    isFree = false;
  } else if (pricing?.subscription) {
    const s = pricing.subscription;
    const price = s.cycleDuration?.price;
    const cycle = s.cycleDuration?.count;
    const unit = s.cycleDuration?.unit;
    if (price) {
      priceDisplay = `${price.currency || ''} ${price.value || '0'}`;
      isFree = false;
    }
    if (unit) period = unit.toLowerCase();
  } else if (pricing?.free) {
    priceDisplay = 'Free';
    isFree = true;
  }

  return {
    id: plan.id,
    name: plan.name,
    description: plan.description,
    priceDisplay,
    period,
    isFree,
    highlighted: plan.primary || false,
    perks: (plan.perks?.values || []).map(p => p.value || p),
    maxPurchasesPerBuyer: plan.maxPurchasesPerBuyer,
    hasFreeTrial: !!plan.freeTrialDays,
    freeTrialDays: plan.freeTrialDays,
    slug: plan.slug,
  };
}

Deno.serve(async (req) => {
  try {
    const clientId = Deno.env.get("WIX_CLIENT_ID");
    const instanceId = Deno.env.get("WIX_INSTANCE_ID");
    if (!clientId || !instanceId) return Response.json({ error: "Missing config" }, { status: 500 });

    const accessToken = await getAnonToken(clientId);
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'wix-site-id': instanceId,
    };

    const res = await fetch('https://www.wixapis.com/pricing-plans/v2/plans?fieldsets=FULL&archived=false', { headers });
    const data = await safeJson(res);

    if (!res.ok) {
      console.error('[getWixPlans] Error:', JSON.stringify(data));
      return Response.json({ plans: [] });
    }

    const plans = (data.plans || []).map(transformPlan);
    // Sort: free first, then by price ascending, but highlighted in middle
    return Response.json({ plans });

  } catch (err) {
    console.error('[getWixPlans] Exception:', err.message);
    return Response.json({ plans: [], error: err.message }, { status: 500 });
  }
});
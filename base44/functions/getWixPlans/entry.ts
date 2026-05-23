import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

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

function processPlan(plan) {
  if (!plan) return null;
  
  // Get primary price
  const primaryPrice = plan.price?.value || plan.price?.amount || 0;
  const currency = plan.currency || 'USD';
  
  // Format price display
  const priceDisplay = primaryPrice === 0 ? 'Free' : `${currency}${primaryPrice}`;
  
  // Get perks/benefits
  const perks = (plan.benefits || plan.perks || []).map(b => ({
    label: b.name || b.description || 'Benefit',
    value: b.description || b.name || '',
  }));
  
  return {
    id: plan._id || plan.id,
    name: plan.name,
    description: plan.description,
    priceDisplay,
    price: primaryPrice,
    currency,
    period: plan.frequency?.unit || plan.pricingSchema?.frequency?.unit || 'month',
    hasFreeTrial: !!plan.trialPeriod?.duration,
    freeTrialDays: plan.trialPeriod?.duration || 0,
    perks,
    highlighted: false,
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
      'Content-Type': 'application/json',
    };

    // Try different Wix endpoints for pricing plans
    const endpoints = [
      `https://www.wixapis.com/pricing-plans/v1/plans`,
      `https://www.wixapis.com/v1/plans`,
      `https://www.wixapis.com/site-memberships/v1/plans`,
    ];

    let plans = [];
    for (const endpoint of endpoints) {
      try {
        const res = await fetch(endpoint, { method: 'GET', headers });
        const data = await safeJson(res);
        
        if (res.ok && data.plans) {
          plans = data.plans.map(processPlan);
          break;
        }
      } catch (err) {
        console.log(`Tried ${endpoint}, failed:`, err.message);
      }
    }

    // If no plans from API, return empty array (fallback to static data in frontend)
    return Response.json({ plans });

  } catch (err) {
    console.error('[getWixPlans] Exception:', err.message);
    return Response.json({ error: err.message, plans: [] }, { status: 500 });
  }
});
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import Header from '../components/Header';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

// Fallback plans if Wix API doesn't return data
const FALLBACK_PLANS = [
  {
    id: '1',
    name: 'Cadet',
    description: 'Basic access to ship facilities',
    priceDisplay: '₪29',
    price: 29,
    currency: '₪',
    period: 'month',
    hasFreeTrial: false,
    freeTrialDays: 0,
    perks: ['Access to Medical Bay', '5% Shop Discount', 'Monthly Newsletter'],
    highlighted: false,
  },
  {
    id: '2',
    name: 'Lieutenant',
    description: 'Enhanced benefits for dedicated crew',
    priceDisplay: '₪59',
    price: 59,
    currency: '₪',
    period: 'month',
    hasFreeTrial: true,
    freeTrialDays: 7,
    perks: ['Priority Medical Appointments', '15% Shop Discount', 'Free Cinema Tickets', 'Restaurant Delivery'],
    highlighted: true,
  },
  {
    id: '3',
    name: 'Captain',
    description: 'Full access to all ship privileges',
    priceDisplay: '₪99',
    price: 99,
    currency: '₪',
    period: 'month',
    hasFreeTrial: true,
    freeTrialDays: 14,
    perks: ['24/7 Medical Access', '25% Shop Discount', 'Unlimited Cinema', 'Private Dining', 'Bridge Visits'],
    highlighted: false,
  },
];

export default function Plans() {
  const [plans, setPlans] = useState(FALLBACK_PLANS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.functions.invoke('getWixPlans', {})
      .then(res => {
        const fetched = res.data.plans || [];
        if (fetched.length > 0) {
          // Mark middle plan as highlighted if 3 plans
          if (fetched.length === 3) fetched[1].highlighted = true;
          setPlans(fetched);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSubscribe = async (plan) => {
    try {
      // For now, redirect to Wix plans page
      const siteId = await base44.functions.invoke('getWixConfig', {}).then(r => r.data.siteId);
      if (siteId) {
        window.open(`https://${siteId}.wixsite.com/pricing-plans`, '_blank');
      }
    } catch (err) {
      console.error('Subscribe error:', err);
    }
  };

  return (
    <div className="min-h-screen bg-background font-body">
      <Header />
      <div className="pt-28 px-[6vw] md:px-[8vw] pb-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16">
          <p className="font-mono text-xs tracking-widest uppercase text-primary mb-2">★ Choose Your Rank ★</p>
          <h1 className="font-display text-5xl md:text-7xl tracking-widest text-foreground uppercase mb-4">Crew Membership Plans</h1>
          <p className="text-muted-foreground">Choose your rank aboard the SS Scratching Post</p>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-32"><div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" /></div>
        ) : plans.length === 0 ? (
          <p className="text-center text-muted-foreground py-32">No plans available.</p>
        ) : (
          <div className={`grid gap-6 ${plans.length === 3 ? 'md:grid-cols-3' : plans.length === 2 ? 'md:grid-cols-2 max-w-2xl mx-auto' : 'max-w-md mx-auto'}`}>
            {plans.map((plan, i) => (
              <motion.div key={plan.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                className={`relative border p-8 flex flex-col ${plan.highlighted ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}>
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground font-mono text-xs px-4 py-1 rounded-full">MOST POPULAR</span>
                  </div>
                )}

                <h2 className="font-display text-3xl tracking-widest text-primary uppercase mb-2">{plan.name}</h2>
                {plan.description && <p className="text-muted-foreground text-sm mb-6">{plan.description}</p>}

                <div className="mb-4">
                  <span className="font-display text-4xl text-foreground">{plan.priceDisplay}</span>
                  {plan.period && <span className="text-muted-foreground text-sm font-mono ml-1">/{plan.period}</span>}
                </div>

                {plan.hasFreeTrial && (
                  <p className="text-primary text-xs font-mono mb-4 italic">{plan.freeTrialDays}-day free trial</p>
                )}

                {plan.perks?.length > 0 && (
                  <ul className="space-y-2 mb-8 flex-1">
                    {plan.perks.map((perk, pi) => (
                      <li key={pi} className="flex items-start gap-2 text-sm text-foreground/80">
                        <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        <span>{perk.label || perk}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <button
                  onClick={() => handleSubscribe(plan)}
                  className={`w-full py-3 font-display text-lg tracking-widest uppercase transition-colors ${plan.highlighted
                    ? 'bg-primary text-primary-foreground hover:bg-primary/80'
                    : 'bg-muted text-foreground hover:bg-muted/80 border border-border'}`}>
                  Subscribe
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
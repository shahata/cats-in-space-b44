import { Leaf, Wheat, Flame, Fish, Egg, Nut, Milk } from 'lucide-react';

const LABEL_CONFIG = {
  vegan: { icon: Leaf, color: 'text-green-500' },
  vegetarian: { icon: Leaf, color: 'text-green-400' },
  'gluten free': { icon: Wheat, color: 'text-amber-400' },
  'gluten-free': { icon: Wheat, color: 'text-amber-400' },
  glutenfree: { icon: Wheat, color: 'text-amber-400' },
  wheat: { icon: Wheat, color: 'text-orange-400' },
  hot: { icon: Flame, color: 'text-red-500' },
  spicy: { icon: Flame, color: 'text-red-500' },
  shellfish: { icon: Fish, color: 'text-cyan-400' },
  fish: { icon: Fish, color: 'text-cyan-400' },
  eggs: { icon: Egg, color: 'text-yellow-400' },
  egg: { icon: Egg, color: 'text-yellow-400' },
  peanuts: { icon: Nut, color: 'text-orange-300' },
  nuts: { icon: Nut, color: 'text-orange-300' },
  soy: { icon: Leaf, color: 'text-green-300' },
  dairy: { icon: Milk, color: 'text-blue-300' },
  'non-alcoholic': { icon: Leaf, color: 'text-blue-400' },
};

export default function DietaryLabel({ label }) {
  if (!label) return null;
  const key = label.toLowerCase().trim();
  const cfg = LABEL_CONFIG[key] || { icon: Leaf, color: 'text-muted-foreground' };
  const Icon = cfg.icon;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 border border-primary/30 rounded-full text-[10px] font-mono uppercase">
      <Icon className={`w-3 h-3 ${cfg.color}`} />
      <span className="text-primary">{label}</span>
    </span>
  );
}
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import Header from '../components/Header';
import ProductCard from '../components/ProductCard';
import useWixCart from '../lib/useWixCart';
import { motion } from 'framer-motion';
import { ArrowDown } from 'lucide-react';

export default function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addItem } = useWixCart();

  useEffect(() => {
    base44.functions.invoke('getWixProducts', {}).then(res => {
      setProducts(res.data.products || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-background font-body">
      <Header />

      {/* Hero */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=1800&q=80"
            alt="Space"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/60" />
        </div>
        <div className="relative z-10 px-[6vw] text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }}>
            <p className="font-mono text-xs tracking-widest uppercase mb-6 text-primary">BREAKING: Earth's litter box declared full...</p>
            <h1 className="font-display text-7xl md:text-[120px] lg:text-[160px] tracking-widest leading-none mb-6 text-primary uppercase">
              Cats in Space
            </h1>
            <p className="font-display text-xl md:text-3xl text-foreground/90 italic mb-4 tracking-wide">
              Earth's litter box is full. Time to find a new planet.
            </p>
            <p className="font-body text-foreground/60 text-base md:text-lg max-w-md mx-auto mb-10">
              A brave crew of cats has launched into the cosmos...
            </p>
            <button
              onClick={() => document.getElementById('collection')?.scrollIntoView({ behavior: 'smooth' })}
              className="inline-flex items-center gap-3 bg-primary text-primary-foreground px-8 py-3 font-display text-lg tracking-widest uppercase hover:bg-primary/80 transition-colors"
            >
              Explore the Shop
              <ArrowDown className="w-4 h-4" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* Collection */}
      <section id="collection" className="px-[6vw] md:px-[8vw] py-20 md:py-28">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="flex items-baseline justify-between mb-14">
          <div>
            <p className="font-mono text-xs tracking-widest uppercase text-primary mb-2">★ Space Gear ★</p>
            <h2 className="font-display text-4xl md:text-6xl tracking-widest text-foreground uppercase">Mission Supplies</h2>
          </div>
          {products.length > 0 && (
            <span className="font-mono text-sm text-muted-foreground">{products.length} items</span>
          )}
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" />
          </div>
        ) : products.length === 0 ? (
          <p className="text-muted-foreground text-center py-32 font-body">No products available yet.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-5 gap-y-14">
            {products.map((p, i) => (
              <ProductCard key={p.id} product={p} onAdd={addItem} index={i} />
            ))}
          </div>
        )}
      </section>

      {/* Footer strip */}
      <footer className="border-t border-border/30 px-[6vw] md:px-[8vw] py-10 flex flex-col md:flex-row items-center justify-between gap-4">
        <span className="font-display text-2xl tracking-widest text-primary uppercase">Cats in Space</span>
        <p className="text-muted-foreground text-xs font-mono">© 2026 — One small step for cat, one giant leap for catkind.</p>
      </footer>
    </div>
  );
}
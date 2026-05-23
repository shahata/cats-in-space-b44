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
      <section className="relative h-screen flex items-end pb-16 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1556742044-3c52d6e88c62?w=1800&q=80"
            alt="Hero"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/20 to-transparent" />
        </div>
        <div className="relative z-10 px-[6vw] md:px-[8vw] text-background w-full">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }}>
            <p className="font-mono text-xs tracking-widest uppercase mb-4 text-background/70">New Collection — 2025</p>
            <h1 className="font-display text-6xl md:text-8xl lg:text-[110px] tracking-tight leading-none mb-6">
              Atelier<br /><em>Essence</em>
            </h1>
            <p className="font-body text-background/80 text-base md:text-lg max-w-md mb-10">
              Curated objects designed for modern living. Each piece tells a story.
            </p>
            <button
              onClick={() => document.getElementById('collection')?.scrollIntoView({ behavior: 'smooth' })}
              className="inline-flex items-center gap-3 text-background/80 hover:text-background text-sm transition-colors font-mono tracking-wider group"
            >
              Explore the Collection
              <ArrowDown className="w-4 h-4 group-hover:translate-y-1 transition-transform" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* Collection */}
      <section id="collection" className="px-[6vw] md:px-[8vw] py-20 md:py-28">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="flex items-baseline justify-between mb-14">
          <div>
            <p className="font-mono text-xs tracking-widest uppercase text-muted-foreground mb-2">Our Catalog</p>
            <h2 className="font-display text-4xl md:text-5xl tracking-tight">The Collection</h2>
          </div>
          {products.length > 0 && (
            <span className="font-mono text-sm text-muted-foreground">{products.length} pieces</span>
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
      <footer className="border-t border-border/50 px-[6vw] md:px-[8vw] py-10 flex flex-col md:flex-row items-center justify-between gap-4">
        <span className="font-display text-xl tracking-tight">Atelier Essence</span>
        <p className="text-muted-foreground text-xs font-mono">© 2025 All rights reserved</p>
      </footer>
    </div>
  );
}
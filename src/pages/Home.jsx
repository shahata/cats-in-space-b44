import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import Header from '../components/Header';
import ProductCard from '../components/ProductCard';
import useCart from '../lib/useCart';
import { motion } from 'framer-motion';

export default function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addItem } = useCart();

  useEffect(() => {
    base44.entities.Product.list().then(data => {
      setProducts(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="min-h-screen bg-background font-body">
      <Header />
      <main className="px-[6vw] md:px-[8vw] pt-28 md:pt-36 pb-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
          <h1 className="font-display text-5xl md:text-7xl lg:text-[96px] tracking-tight leading-none mb-2">
            The Collection
          </h1>
          <p className="text-muted-foreground font-body text-base md:text-lg max-w-md mt-4 mb-16">
            Curated objects designed for modern living. Each piece tells a story.
          </p>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" />
          </div>
        ) : products.length === 0 ? (
          <p className="text-muted-foreground text-center py-32 font-body">No products available yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-14">
            {products.map((p, i) => (
              <ProductCard key={p.id} product={p} onAdd={addItem} index={i} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import Header from '../components/Header';
import ProductCard from '../components/ProductCard';
import useWixCart from '../lib/useWixCart';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

export default function Shop() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addItem } = useWixCart();

  useEffect(() => {
    base44.functions.invoke('getWixProducts', {})
      .then(r => setProducts(r.data.products || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-background font-body">
      <Header />
      <div className="pt-28 px-[6vw] md:px-[8vw] pb-20">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-mono text-muted-foreground hover:text-primary transition-colors mb-10">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <p className="font-mono text-xs tracking-widest uppercase text-primary mb-2">★ Space Gear ★</p>
          <h1 className="font-display text-5xl md:text-7xl tracking-widest text-foreground uppercase mb-2">Shop</h1>
          <p className="text-muted-foreground font-body mb-14">Mission supplies and cosmic essentials</p>
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
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <ProductCard product={p} onAdd={addItem} index={i} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
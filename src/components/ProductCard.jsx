import { useState } from 'react';
import { Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import VariantModal from './VariantModal';

export default function ProductCard({ product, onAdd, index }) {
  const [added, setAdded] = useState(false);
  const [showVariants, setShowVariants] = useState(false);

  const handleAdd = () => {
    if (product.hasVariants) {
      setShowVariants(true);
      return;
    }
    onAdd(product.wixId || product.id);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  const handleVariantAdd = async (productId, variantId) => {
    await onAdd(productId, variantId);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  const isWide = index % 3 === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6, delay: (index % 3) * 0.1 }}
      className={`group ${isWide ? 'md:col-span-2' : 'md:col-span-1'}`}
    >
      <div className="relative overflow-hidden bg-muted/40 aspect-[4/5] mb-4 cursor-pointer" onClick={handleAdd}>
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center font-display text-4xl text-muted-foreground/30">
            {product.name[0]}
          </div>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); handleAdd(); }}
          className="absolute bottom-4 right-4 w-11 h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 hover:scale-110"
        >
          {added ? (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-xs font-mono">✓</motion.span>
          ) : (
            <Plus className="w-5 h-5" strokeWidth={1.5} />
          )}
        </button>
      </div>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="font-display text-lg md:text-xl tracking-tight group-hover:italic transition-all truncate">{product.name}</h3>
          <p className="text-muted-foreground text-sm mt-1 line-clamp-2 font-body">{product.description}</p>
        </div>
        <span className="font-mono text-sm tracking-wide shrink-0">${product.price?.toFixed(2)}</span>
      </div>
      {showVariants && (
        <VariantModal
          product={product}
          onAdd={handleVariantAdd}
          onClose={() => setShowVariants(false)}
        />
      )}
    </motion.div>
  );
}
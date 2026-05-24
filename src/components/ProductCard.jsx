import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Eye, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import VariantModal from './VariantModal';

export default function ProductCard({ product, onAdd, index }) {
  const [added, setAdded] = useState(false);
  const [showVariants, setShowVariants] = useState(false);
  const [adding, setAdding] = useState(false);

  const needsSelection = (product.productOptions?.length || 0) > 0;

  const handleAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (needsSelection) { setShowVariants(true); return; }
    setAdding(true);
    onAdd(product.wixId || product.id).then(() => {
      setAdding(false);
      setAdded(true);
      setTimeout(() => setAdded(false), 1500);
    }).catch(() => setAdding(false));
  };

  const handleVariantAdd = async (productId, variantId, choices) => {
    await onAdd(productId, variantId, choices);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.6, delay: (index % 3) * 0.08 }}
        className="group"
      >
        <Link to={`/product/${product.id}`} className="block">
          {/* Image */}
          <div className="relative overflow-hidden bg-muted/40 aspect-[3/4] mb-4">
            {product.image ? (
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-104"
                style={{ transform: 'scale(1)', transition: 'transform 700ms ease' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-display text-5xl text-muted-foreground/20">
                {product.name[0]}
              </div>
            )}

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/10 transition-all duration-300 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                <span className="bg-background/90 backdrop-blur-sm text-foreground text-xs tracking-widest uppercase font-mono px-4 py-2 flex items-center gap-2">
                  <Eye className="w-3.5 h-3.5" /> View Details
                </span>
              </div>
            </div>

            {/* Add to cart button */}
            {product.inStock !== false && (
              <button
                onClick={handleAdd}
                className="absolute bottom-3 right-3 w-10 h-10 bg-primary text-primary-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 hover:scale-110"
                title="Add to bag"
              >
                {added ? (
                  <Check className="w-4 h-4" />
                ) : adding ? (
                  <span className="w-3.5 h-3.5 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <ShoppingBag className="w-4 h-4" strokeWidth={1.5} />
                )}
              </button>
            )}

            {!product.inStock && (
              <div className="absolute top-3 left-3 bg-background/90 text-muted-foreground text-[10px] tracking-widest uppercase font-mono px-2 py-1">
                Sold Out
              </div>
            )}

            {product.ribbon && product.inStock && (
              <div className="absolute top-3 left-3 bg-primary text-primary-foreground text-[10px] tracking-widest uppercase font-mono px-2 py-1">
                {product.ribbon}
              </div>
            )}

            {/* Category tags top-left, like the reference site */}
            {product.collections?.length > 0 && (
              <div className="absolute top-3 right-3 flex flex-col gap-1 items-end">
                {product.collections.slice(0, 2).map(c => (
                  <span key={c.id} className="bg-primary/90 text-primary-foreground text-[9px] tracking-widest uppercase font-mono px-2 py-0.5">
                    {c.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-display text-lg tracking-tight leading-tight group-hover:italic transition-all duration-300 truncate">{product.name}</h3>
              <p className="text-muted-foreground text-xs mt-1.5 line-clamp-2 font-body leading-relaxed" dangerouslySetInnerHTML={{ __html: product.description }} />
            </div>
            <span className="font-mono text-sm tracking-wide shrink-0 mt-0.5">{product.formattedPrice || product.price?.toFixed(2)}</span>
          </div>
        </Link>
      </motion.div>

      {showVariants && (
        <VariantModal
          product={product}
          onAdd={handleVariantAdd}
          onClose={() => setShowVariants(false)}
        />
      )}
    </>
  );
}
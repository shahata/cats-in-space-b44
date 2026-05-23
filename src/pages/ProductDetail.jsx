import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ShoppingBag, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import Header from '../components/Header';
import useWixCart from '../lib/useWixCart';

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selections, setSelections] = useState({});
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState('');
  const { addItem } = useWixCart();

  useEffect(() => {
    base44.functions.invoke('getWixProducts', {}).then(res => {
      const found = res.data.products?.find(p => p.id === id || p.wixId === id);
      setProduct(found || null);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center font-body">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Product not found.</p>
          <Link to="/" className="text-primary hover:underline underline-offset-4 text-sm">Back to shop</Link>
        </div>
      </div>
    );
  }

  const images = product.gallery?.length > 0 ? product.gallery : (product.image ? [product.image] : []);
  const options = product.productOptions || [];
  const allSelected = options.every(o => selections[o.name]);

  const getMatchingVariant = () => {
    if (!product.variants?.length) return null;
    return product.variants.find(v => options.every(o => v.choices?.[o.name] === selections[o.name]));
  };

  const handleAdd = async () => {
    if (product.hasVariants && !allSelected) { setError('Please select all options.'); return; }
    if (product.hasVariants) {
      const variant = getMatchingVariant();
      if (!variant) { setError('This combination is unavailable.'); return; }
      if (!variant.stock) { setError('This variant is out of stock.'); return; }
      setAdding(true); setError('');
      await addItem(product.wixId || product.id, variant.id);
    } else {
      setAdding(true); setError('');
      await addItem(product.wixId || product.id);
    }
    setAdding(false);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background font-body">
      <Header />
      <main className="pt-24 md:pt-28 pb-20">
        <div className="px-[6vw] md:px-[8vw] mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Collection
          </Link>
        </div>

        <div className="px-[6vw] md:px-[8vw] grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 max-w-7xl mx-auto">
          {/* Image Gallery */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}>
            <div className="relative bg-muted/30 aspect-[4/5] overflow-hidden mb-3">
              <AnimatePresence mode="wait">
                <motion.img
                  key={selectedImage}
                  src={images[selectedImage]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                />
              </AnimatePresence>
              {images.length > 1 && (
                <>
                  <button onClick={() => setSelectedImage(i => (i - 1 + images.length) % images.length)} className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button onClick={() => setSelectedImage(i => (i + 1) % images.length)} className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((img, i) => (
                  <button key={i} onClick={() => setSelectedImage(i)} className={`flex-shrink-0 w-16 h-16 overflow-hidden border-2 transition-all ${selectedImage === i ? 'border-primary' : 'border-transparent opacity-60 hover:opacity-100'}`}>
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          {/* Product Info */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className="flex flex-col">
            <p className="text-muted-foreground text-xs tracking-widest uppercase font-mono mb-3">Folio Ceramics</p>
            <h1 className="font-display text-4xl md:text-5xl tracking-tight leading-tight mb-4">{product.name}</h1>
            <p className="font-mono text-2xl mb-6">
              {(() => {
                const variant = getMatchingVariant();
                if (variant) return variant.formattedPrice || variant.price?.toFixed(2);
                return product.formattedPrice || product.price?.toFixed(2);
              })()}
            </p>

            {product.description && (
              <div className="text-muted-foreground text-sm leading-relaxed mb-8 prose prose-sm max-w-none [&_p]:mb-3 [&_p:last-child]:mb-0" dangerouslySetInnerHTML={{ __html: product.description }} />
            )}

            {/* Variants */}
            {options.length > 0 && (
              <div className="space-y-5 mb-8">
                {options.map(option => (
                  <div key={option.name}>
                    <p className="text-xs tracking-widest uppercase text-muted-foreground mb-3 font-mono">{option.name}</p>
                    <div className="flex flex-wrap gap-2">
                      {option.choices.map(choice => {
                        const val = typeof choice === 'object' ? choice.value : choice;
                        const available = typeof choice === 'object' ? choice.inStock !== false : true;
                        return (
                          <button
                            key={val}
                            disabled={!available}
                            onClick={() => available && setSelections(s => ({ ...s, [option.name]: val }))}
                            className={`px-5 py-2.5 text-sm border transition-all ${
                              selections[option.name] === val
                                ? 'bg-primary text-primary-foreground border-primary'
                                : available
                                  ? 'bg-transparent text-foreground border-border hover:border-foreground'
                                  : 'opacity-40 cursor-not-allowed line-through border-border text-muted-foreground'
                            }`}
                          >
                            {val}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {error && <p className="text-destructive text-sm mb-4">{error}</p>}

            {!product.inStock ? (
              <button disabled className="w-full py-4 bg-muted text-muted-foreground text-sm tracking-widest uppercase cursor-not-allowed">Out of Stock</button>
            ) : (
              <button
                onClick={handleAdd}
                disabled={adding}
                className="w-full py-4 bg-primary text-primary-foreground text-sm tracking-widest uppercase hover:opacity-90 transition-all flex items-center justify-center gap-3 disabled:opacity-60"
              >
                {added ? (
                  <><Check className="w-4 h-4" /> Added to Bag</>
                ) : adding ? (
                  <span className="w-4 h-4 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <><ShoppingBag className="w-4 h-4" strokeWidth={1.5} /> Add to Bag</>
                )}
              </button>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
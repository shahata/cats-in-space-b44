import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import Header from '../components/Header';
import ProductCard from '../components/ProductCard';
import GiftCardWidget from '../components/GiftCardWidget';
import useWixCart from '../lib/useWixCart';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

export default function Shop() {
  const [products, setProducts] = useState([]);
  const [collections, setCollections] = useState([]);
  const [giftCard, setGiftCard] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const { addItem } = useWixCart();

  useEffect(() => {
    Promise.all([
      base44.functions.invoke('getWixProducts', {}).then(r => r.data).catch(() => ({ products: [], collections: [] })),
      base44.functions.invoke('getWixGiftCard', {}).then(r => r.data.giftCard).catch(() => null),
    ]).then(([prodData, gc]) => {
      setProducts(prodData.products || []);
      setCollections(prodData.collections || []);
      setGiftCard(gc);
    }).finally(() => setLoading(false));
  }, []);

  const filteredProducts = useMemo(() => {
    if (activeCategory === 'all') return products;
    if (activeCategory === 'gift-cards') return [];
    return products.filter(p => p.collections?.some(c => c.id === activeCategory));
  }, [products, activeCategory]);

  const showGiftCard = giftCard && (activeCategory === 'all' || activeCategory === 'gift-cards');

  const handleGiftCardAdd = async (data) => {
    // Add gift card as a checkout item — uses gift voucher app
    // For now, redirect to checkout with gift card metadata
    console.log('Gift card add:', data);
    // TODO: Use Wix gift voucher purchase API
  };

  const handleGiftCardBuyNow = async (data) => {
    try {
      const res = await base44.functions.invoke('createWixCheckout', {
        giftCard: data,
      });
      if (res.data?.checkoutUrl) window.location.href = res.data.checkoutUrl;
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-background font-body">
      <Header />
      <div className="pt-28 px-[6vw] md:px-[8vw] pb-20">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-mono text-muted-foreground hover:text-primary transition-colors mb-10">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <p className="font-mono text-xs tracking-widest uppercase text-primary mb-2">★ Space Gear ★</p>
          <h1 className="font-display text-5xl md:text-7xl tracking-widest text-foreground uppercase mb-2">Space Cat Supply Depot</h1>
          <p className="text-muted-foreground font-body mb-10">Gear up for the mission. Every purchase supports the Feline Space Program.</p>
        </motion.div>

        {/* Category tabs */}
        {!loading && (collections.length > 0 || giftCard) && (
          <div className="flex flex-wrap gap-2 mb-10 border-b border-border pb-1">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-4 py-2 text-xs font-mono tracking-widest uppercase border-b-2 transition-colors -mb-px ${
                activeCategory === 'all'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              All Products
            </button>
            {collections.map(col => (
              <button
                key={col.id}
                onClick={() => setActiveCategory(col.id)}
                className={`px-4 py-2 text-xs font-mono tracking-widest uppercase border-b-2 transition-colors -mb-px ${
                  activeCategory === col.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {col.name}
              </button>
            ))}
            {giftCard && (
              <button
                onClick={() => setActiveCategory('gift-cards')}
                className={`px-4 py-2 text-xs font-mono tracking-widest uppercase border-b-2 transition-colors -mb-px ${
                  activeCategory === 'gift-cards'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Gift Cards
              </button>
            )}
          </div>
        )}

        {showGiftCard && (
          <GiftCardWidget
            giftCard={giftCard}
            onAddToCart={handleGiftCardAdd}
            onBuyNow={handleGiftCardBuyNow}
          />
        )}

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" />
          </div>
        ) : filteredProducts.length === 0 && activeCategory !== 'gift-cards' ? (
          <p className="text-muted-foreground text-center py-32 font-body">No products in this category yet.</p>
        ) : filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-14">
            {filteredProducts.map((p, i) => (
              <ProductCard key={p.id} product={p} onAdd={addItem} index={i} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
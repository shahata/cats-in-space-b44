import { Link } from 'react-router-dom';
import Header from '../components/Header';
import CartItem from '../components/CartItem';
import useWixCart from '../lib/useWixCart';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Cart() {
  const { lineItems: items, updateItem: updateQuantity, removeItem, total, formattedTotal, count, loading, actionLoading } = useWixCart();

  if (loading) {
    return (
      <div className="min-h-screen bg-background font-body flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-body relative">
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=1800&q=80"
          alt=""
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-background/80" />
      </div>
      <Header />
      <main className="px-[6vw] md:px-[8vw] pt-28 md:pt-36 pb-20 max-w-3xl mx-auto relative z-10">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-10 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Continue shopping
          </Link>

          <h1 className="font-display text-4xl md:text-5xl tracking-tight mb-12">Your Bag</h1>

          {items.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-muted-foreground mb-6">Your bag is empty.</p>
              <Link to="/" className="inline-flex items-center gap-2 text-primary hover:underline underline-offset-4 text-sm">
                Explore the collection <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <>
              <div className="border-t border-border/50">
                {items.map(item => (
                  <CartItem key={item._id || item.id} item={item} onUpdateQty={updateQuantity} onRemove={removeItem} disabled={actionLoading} />
                ))}
              </div>

              <div className="mt-10 flex flex-col items-end gap-6">
                <div className="flex items-baseline gap-8">
                  <span className="text-muted-foreground text-sm">Total ({count} {count === 1 ? 'item' : 'items'})</span>
                  <span className="font-mono text-2xl">{formattedTotal || `${total.toFixed(2)}`}</span>
                </div>
                <Link
                  to="/checkout"
                  className="w-full md:w-auto px-12 py-4 bg-primary text-primary-foreground font-body text-sm tracking-wide hover:opacity-90 transition-opacity text-center"
                >
                  Proceed to Checkout
                </Link>
              </div>
            </>
          )}
        </motion.div>
      </main>
    </div>
  );
}
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import CartItem from '../components/CartItem';
import useCart from '../lib/useCart';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Cart() {
  const { items, updateQuantity, removeItem, total, count } = useCart();

  return (
    <div className="min-h-screen bg-background font-body">
      <Header />
      <main className="px-[6vw] md:px-[8vw] pt-28 md:pt-36 pb-20 max-w-3xl mx-auto">
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
                  <CartItem key={item.product_id} item={item} onUpdateQty={updateQuantity} onRemove={removeItem} />
                ))}
              </div>

              <div className="mt-10 flex flex-col items-end gap-6">
                <div className="flex items-baseline gap-8">
                  <span className="text-muted-foreground text-sm">Total ({count} {count === 1 ? 'item' : 'items'})</span>
                  <span className="font-mono text-2xl">${total.toFixed(2)}</span>
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
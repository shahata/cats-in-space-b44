import { useState } from 'react';
import { Link } from 'react-router-dom';
import useWixCart from '../lib/useWixCart';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Checkout() {
  const { lineItems: items, total, formattedTotal, createCheckout, loading } = useWixCart();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleCheckout = async () => {
    setSubmitting(true);
    setError('');
    const res = await createCheckout();
    if (res.checkoutUrl) {
      window.location.href = res.checkoutUrl;
    } else {
      setError('Could not create checkout. Please try again.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background font-body flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background font-body flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Your bag is empty.</p>
          <Link to="/" className="text-primary hover:underline underline-offset-4 text-sm">Back to shop</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 font-body">
      <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-[6vw] md:px-[8vw] pt-12 pb-20 max-w-xl mx-auto">
        <Link to="/cart" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-12 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to bag
        </Link>

        <h1 className="font-display text-4xl md:text-5xl tracking-tight mb-4">Order Summary</h1>
        <p className="text-muted-foreground text-sm mb-10 font-mono">
          {items.length} {items.length === 1 ? 'item' : 'items'} · {formattedTotal || total.toFixed(2)}
        </p>

        <div className="border-t border-border/50 mb-10">
          {items.map(item => (
            <div key={item.id} className="flex justify-between items-center py-4 border-b border-border/50">
              <div>
                <p className="text-sm font-body">{item.productName?.translated || item.productName?.original}</p>
                <p className="text-xs text-muted-foreground font-mono">Qty: {item.quantity}</p>
              </div>
              <p className="font-mono text-sm">{item.price?.formattedAmount}</p>
            </div>
          ))}
          <div className="flex justify-between items-baseline pt-6">
            <span className="text-muted-foreground text-sm">Total</span>
            <span className="font-mono text-2xl">{formattedTotal || total.toFixed(2)}</span>
          </div>
        </div>

        {error && <p className="text-destructive text-sm mb-4">{error}</p>}

        <button
          onClick={handleCheckout}
          disabled={submitting}
          className="w-full py-4 bg-primary text-primary-foreground text-sm tracking-wide hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Proceed to Wix Checkout →'}
        </button>

        <p className="text-xs text-muted-foreground text-center mt-4">
          You'll be redirected to our secure Wix checkout to complete your purchase.
        </p>
      </motion.main>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';

export default function OrderConfirmation() {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const orderId = new URLSearchParams(window.location.search).get('id');

  useEffect(() => {
    if (!orderId) { setLoading(false); return; }
    base44.entities.Order.get(orderId).then(o => { setOrder(o); setLoading(false); });
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background font-body flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Order not found.</p>
          <Link to="/" className="text-primary hover:underline underline-offset-4 text-sm">Back to shop</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-body flex items-center justify-center px-[6vw]">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center max-w-lg"
      >
        <p className="text-muted-foreground text-xs font-mono tracking-widest uppercase mb-6">Order Confirmed</p>
        <h1 className="font-display text-6xl md:text-8xl lg:text-[120px] tracking-tight leading-none mb-8">
          #{order.id?.slice(-6).toUpperCase()}
        </h1>
        <div className="h-px bg-border w-16 mx-auto mb-8" />
        <p className="text-muted-foreground text-sm mb-2">Thank you, {order.customer_name}.</p>
        <p className="text-muted-foreground text-sm mb-8">
          A confirmation has been sent to <span className="text-foreground">{order.email}</span>.
        </p>

        <div className="text-left border-t border-border/50 pt-6 mb-8">
          {order.items?.map((item, i) => (
            <div key={i} className="flex justify-between py-2 text-sm">
              <span>{item.name} <span className="text-muted-foreground">×{item.quantity}</span></span>
              <span className="font-mono">${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
          <div className="flex justify-between pt-4 border-t border-border/50 mt-2">
            <span className="font-body text-sm">Total</span>
            <span className="font-mono text-lg">${order.total?.toFixed(2)}</span>
          </div>
        </div>

        <Link to="/" className="inline-block px-10 py-3 border border-foreground text-foreground text-sm tracking-wide hover:bg-foreground hover:text-background transition-all duration-300">
          Continue Shopping
        </Link>
      </motion.div>
    </div>
  );
}
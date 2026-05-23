import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { ArrowLeft, Package } from 'lucide-react';
import Header from '../components/Header';

const STATUS_LABELS = {
  NOT_FULFILLED: 'Processing',
  PARTIALLY_FULFILLED: 'Partially Shipped',
  FULFILLED: 'Shipped',
  CANCELED: 'Cancelled',
  PENDING: 'Pending',
  APPROVED: 'Confirmed',
  PAID: 'Paid',
  NOT_PAID: 'Unpaid',
};

const STATUS_COLORS = {
  FULFILLED: 'text-green-700 bg-green-50',
  PAID: 'text-green-700 bg-green-50',
  APPROVED: 'text-green-700 bg-green-50',
  CANCELED: 'text-red-600 bg-red-50',
  NOT_PAID: 'text-amber-700 bg-amber-50',
  NOT_FULFILLED: 'text-foreground/60 bg-muted',
  PARTIALLY_FULFILLED: 'text-amber-700 bg-amber-50',
  PENDING: 'text-foreground/60 bg-muted',
};

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    base44.functions.invoke('getWixOrders', {})
      .then(res => {
        setOrders(res.data.orders || []);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || 'Failed to load orders.');
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-background font-body relative">
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=1800&q=80"
          alt=""
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-background/85" />
      </div>
      <Header />
      <main className="pt-24 md:pt-28 pb-20 px-[6vw] md:px-[8vw] max-w-4xl mx-auto relative z-10">
        <div className="mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm transition-colors mb-6">
            <ArrowLeft className="w-4 h-4" /> Back to Shop
          </Link>
          <h1 className="font-display text-4xl tracking-tight">My Orders</h1>
        </div>

        {loading && (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" />
          </div>
        )}

        {error && <p className="text-destructive text-sm">{error}</p>}

        {!loading && !error && orders.length === 0 && (
          <div className="text-center py-20">
            <Package className="w-10 h-10 text-muted-foreground/40 mx-auto mb-4" strokeWidth={1} />
            <p className="text-muted-foreground text-sm">No orders yet.</p>
            <Link to="/" className="text-primary hover:underline underline-offset-4 text-sm mt-2 inline-block">Browse the collection</Link>
          </div>
        )}

        <div className="space-y-6">
          {orders.map((order, i) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="border border-border p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
                <div>
                  <p className="font-mono text-xs text-muted-foreground tracking-widest uppercase mb-1">
                    Order #{order.number || order.id?.slice(-8).toUpperCase()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {order.createdDate ? new Date(order.createdDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {order.status && (
                    <span className={`text-[11px] font-mono tracking-widest uppercase px-2.5 py-1 ${STATUS_COLORS[order.status] || 'text-foreground/60 bg-muted'}`}>
                      {STATUS_LABELS[order.status] || order.status}
                    </span>
                  )}
                  {order.paymentStatus && order.paymentStatus !== order.status && (
                    <span className={`text-[11px] font-mono tracking-widest uppercase px-2.5 py-1 ${STATUS_COLORS[order.paymentStatus] || 'text-foreground/60 bg-muted'}`}>
                      {STATUS_LABELS[order.paymentStatus] || order.paymentStatus}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-3 mb-5">
                {order.lineItems?.map((item, j) => (
                  <div key={j} className="flex items-center gap-4">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-14 h-14 object-cover bg-muted/40 shrink-0" />
                    ) : (
                      <div className="w-14 h-14 bg-muted/40 shrink-0 flex items-center justify-center font-display text-xl text-muted-foreground/30">
                        {item.name?.[0]}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-body text-sm truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">Qty: {item.quantity}</p>
                    </div>
                    <p className="font-mono text-sm shrink-0">{item.price}</p>
                  </div>
                ))}
              </div>

              <div className="border-t border-border pt-4 flex justify-between items-center">
                <span className="text-xs font-mono tracking-widest uppercase text-muted-foreground">Total</span>
                <span className="font-mono text-base">{order.total}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
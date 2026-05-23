import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import useCart from '../lib/useCart';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Checkout() {
  const { items, total, clearCart } = useCart();
  const navigate = useNavigate();
  const [form, setForm] = useState({ customer_name: '', email: '', address: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const valid = form.customer_name && form.email && form.address && items.length > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!valid) return;
    setSubmitting(true);
    const order = await base44.entities.Order.create({
      ...form,
      items: items.map(({ product_id, name, price, quantity }) => ({ product_id, name, price, quantity })),
      total,
      status: 'pending'
    });
    clearCart();
    navigate('/order-confirmation?id=' + order.id);
  };

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

  const Field = ({ label, name, type = 'text', required = true, multiline = false }) => (
    <div className="relative group">
      {multiline ? (
        <textarea
          value={form[name]}
          onChange={e => set(name, e.target.value)}
          placeholder=" "
          rows={3}
          className="peer w-full bg-transparent border-0 border-b border-border focus:border-primary outline-none py-3 text-foreground font-body text-base resize-none transition-colors"
        />
      ) : (
        <input
          type={type}
          value={form[name]}
          onChange={e => set(name, e.target.value)}
          placeholder=" "
          required={required}
          className="peer w-full bg-transparent border-0 border-b border-border focus:border-primary outline-none py-3 text-foreground font-body text-base transition-colors"
        />
      )}
      <label className="absolute left-0 top-3 text-muted-foreground text-sm transition-all peer-focus:top-[-8px] peer-focus:text-xs peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-[-8px] peer-[:not(:placeholder-shown)]:text-xs pointer-events-none">
        {label}{required && ' *'}
      </label>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/30 font-body">
      <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-[6vw] md:px-[8vw] pt-12 pb-20 max-w-xl mx-auto">
        <Link to="/cart" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-12 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to bag
        </Link>

        <h1 className="font-display text-4xl md:text-5xl tracking-tight mb-4">Checkout</h1>
        <p className="text-muted-foreground text-sm mb-12 font-mono">{items.length} {items.length === 1 ? 'item' : 'items'} · ${total.toFixed(2)}</p>

        <form onSubmit={handleSubmit} className="space-y-10">
          <Field label="Full Name" name="customer_name" />
          <Field label="Email" name="email" type="email" />
          <Field label="Delivery Address" name="address" />
          <Field label="Notes" name="notes" required={false} multiline />

          <button
            type="submit"
            disabled={!valid || submitting}
            className={`w-full py-4 text-sm tracking-wide transition-all duration-300 flex items-center justify-center gap-2 ${
              valid ? 'bg-primary text-primary-foreground hover:opacity-90' : 'bg-border text-muted-foreground cursor-not-allowed'
            }`}
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Order'}
          </button>
        </form>
      </motion.main>
    </div>
  );
}
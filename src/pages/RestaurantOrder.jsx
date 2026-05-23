import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import Header from '../components/Header';
import DietaryLabel from '../components/DietaryLabel';
import { motion } from 'framer-motion';
import { ArrowLeft, ShoppingBag, Clock, Plus, Minus, Truck, Car } from 'lucide-react';

const currencySymbol = (c) => c === 'ILS' ? '₪' : c === 'USD' ? '$' : (c || '');

export default function RestaurantOrder() {
  const [menuItems, setMenuItems] = useState([]);
  const [sections, setSections] = useState([]);
  const [orderType, setOrderType] = useState('delivery'); // 'delivery' | 'pickup'
  const [cart, setCart] = useState({});
  const [pickupTime, setPickupTime] = useState('');
  const [activeSection, setActiveSection] = useState('all');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    base44.functions.invoke('getWixMenuSections', { includeItems: true })
      .then(res => {
        setMenuItems(res.data.items || []);
        setSections(res.data.sections || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const itemsBySection = useMemo(() => {
    const map = new Map();
    sections.forEach(s => map.set(s.id, { ...s, items: [] }));
    menuItems.forEach(item => {
      if (map.has(item.categoryId)) {
        map.get(item.categoryId).items.push(item);
      }
    });
    return Array.from(map.values()).filter(s => s.items.length > 0);
  }, [sections, menuItems]);

  const addToCart = (item) => {
    setCart(prev => ({
      ...prev,
      [item.id]: { ...item, quantity: (prev[item.id]?.quantity || 0) + 1 },
    }));
  };

  const removeFromCart = (id) => {
    setCart(prev => {
      const next = { ...prev };
      if (next[id]?.quantity > 1) next[id].quantity--;
      else delete next[id];
      return next;
    });
  };

  const cartTotal = Object.values(cart).reduce((s, i) => s + i.price * i.quantity, 0);
  const cartCount = Object.values(cart).reduce((s, i) => s + i.quantity, 0);
  const currency = menuItems[0]?.currency || 'USD';

  const handleCheckout = async () => {
    if (cartCount === 0) return;
    setProcessing(true);
    try {
      const res = await base44.functions.invoke('createRestaurantOrder', {
        items: Object.values(cart),
        pickupTime,
        orderType,
      });
      if (res.data?.checkoutUrl) window.location.href = res.data.checkoutUrl;
    } catch (err) { console.error(err); }
    setProcessing(false);
  };

  const now = new Date();
  const pickupTimes = Array.from({ length: 5 }, (_, i) => {
    const t = new Date(now.getTime() + (i + 1) * 30 * 60000);
    return t.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  });

  const visibleSections = activeSection === 'all'
    ? itemsBySection
    : itemsBySection.filter(s => s.id === activeSection);

  return (
    <div className="min-h-screen bg-background font-body">
      <Header />
      <div className="pt-28 px-[6vw] md:px-[8vw] pb-20">
        <Link to="/restaurant" className="inline-flex items-center gap-2 text-sm font-mono text-muted-foreground hover:text-primary transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to Restaurant
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <h1 className="font-display text-5xl md:text-6xl tracking-widest text-primary uppercase mb-3">Order Online</h1>
          <p className="text-muted-foreground">Fresh from our kitchen to your spaceship. Pick it up when you're ready.</p>
        </motion.div>

        {/* Delivery / Pickup toggle */}
        <div className="flex items-center justify-between gap-4 mb-8 bg-card border border-border p-4 rounded">
          <div className="flex gap-2">
            <button
              onClick={() => setOrderType('delivery')}
              className={`px-5 py-2 text-xs font-mono tracking-widest uppercase rounded transition-colors flex items-center gap-2 ${
                orderType === 'delivery' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Truck className="w-4 h-4" /> Delivery
            </button>
            <button
              onClick={() => setOrderType('pickup')}
              className={`px-5 py-2 text-xs font-mono tracking-widest uppercase rounded transition-colors flex items-center gap-2 ${
                orderType === 'pickup' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Car className="w-4 h-4" /> Pickup
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-[180px_1fr_360px] gap-8">
          {/* Section nav */}
          <aside className="hidden lg:block">
            <div className="sticky top-28 space-y-1">
              {itemsBySection.map(s => (
                <button
                  key={s.id}
                  onClick={() => {
                    setActiveSection(s.id);
                    document.getElementById(`section-${s.id}`)?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className={`block w-full text-left px-3 py-2 text-xs font-mono uppercase tracking-widest border-l-2 transition-colors ${
                    activeSection === s.id
                      ? 'border-primary text-primary bg-primary/5'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </aside>

          {/* Items */}
          <div>
            {loading ? (
              <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" /></div>
            ) : visibleSections.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">No menu available.</p>
            ) : (
              <div className="space-y-10">
                {visibleSections.map(section => (
                  <div key={section.id} id={`section-${section.id}`}>
                    <h2 className="font-display text-2xl md:text-3xl tracking-widest text-primary uppercase mb-5">{section.name}</h2>
                    <div className="grid sm:grid-cols-2 gap-4">
                      {section.items.map((item, i) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 10 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: i * 0.03 }}
                          className="bg-card border border-border p-4 flex gap-3 group"
                        >
                          <div className="flex-1 min-w-0">
                            <h3 className="font-display text-base tracking-wider text-foreground uppercase mb-1">{item.name}</h3>
                            {item.description && <p className="text-muted-foreground text-xs mb-2 line-clamp-2">{item.description}</p>}
                            {item.labels?.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-2">
                                {item.labels.slice(0, 4).map(l => <DietaryLabel key={l} label={l} />)}
                              </div>
                            )}
                            <p className="text-primary font-mono text-sm mt-1">{currencySymbol(item.currency)}{item.price.toFixed(2)}</p>
                          </div>
                          <div className="relative shrink-0">
                            {item.image && (
                              <img src={item.image} alt={item.name} className="w-24 h-24 object-cover rounded" />
                            )}
                            <button
                              onClick={() => addToCart(item)}
                              className="absolute -bottom-2 -right-2 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cart sidebar */}
          <aside className="lg:sticky lg:top-28 h-fit">
            <div className="bg-card border border-border p-6">
              <h3 className="font-display text-xl tracking-widest text-primary uppercase mb-5 flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" /> Your Order
              </h3>

              {cartCount === 0 ? (
                <p className="text-sm text-muted-foreground">Your cart is empty</p>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                    {Object.values(cart).map(item => (
                      <div key={item.id} className="flex items-center justify-between gap-2 text-sm">
                        <div className="flex-1 min-w-0">
                          <div className="font-body truncate">{item.name}</div>
                          <div className="text-xs text-muted-foreground">{currencySymbol(item.currency)}{item.price.toFixed(2)}</div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => removeFromCart(item.id)} className="w-6 h-6 flex items-center justify-center border border-border hover:border-primary">
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-6 text-center text-xs font-mono">{item.quantity}</span>
                          <button onClick={() => addToCart(item)} className="w-6 h-6 flex items-center justify-center border border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-border pt-4">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm text-muted-foreground">Total</span>
                      <span className="text-lg font-mono text-primary">{currencySymbol(currency)}{cartTotal.toFixed(2)}</span>
                    </div>

                    {orderType === 'pickup' && (
                      <div className="mb-4">
                        <label className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
                          <Clock className="w-3 h-3" /> Pickup Time
                        </label>
                        <select
                          value={pickupTime}
                          onChange={(e) => setPickupTime(e.target.value)}
                          className="w-full bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-primary"
                        >
                          <option value="">Select a time</option>
                          {pickupTimes.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                    )}

                    <button
                      onClick={handleCheckout}
                      disabled={processing || (orderType === 'pickup' && !pickupTime)}
                      className="w-full bg-primary text-primary-foreground py-3 font-mono text-xs tracking-widest uppercase hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      {processing ? 'Processing...' : 'Place Order'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
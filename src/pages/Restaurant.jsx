import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import Header from '../components/Header';
import { motion } from 'framer-motion';
import { ArrowLeft, ShoppingBag, Clock, Plus, Minus } from 'lucide-react';

export default function Restaurant() {
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [cart, setCart] = useState({});
  const [pickupTime, setPickupTime] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    base44.functions.invoke('getWixRestaurantMenu', {})
      .then(res => {
        const items = res.data.items || [];
        setMenuItems(items);
        // Extract unique categories
        const cats = [...new Set(items.map(i => i.category).filter(Boolean))];
        setCategories(cats);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filteredItems = selectedCategory === 'all' 
    ? menuItems 
    : menuItems.filter(item => item.category === selectedCategory);

  const addToCart = (item) => {
    setCart(prev => ({
      ...prev,
      [item.id]: {
        ...item,
        quantity: (prev[item.id]?.quantity || 0) + 1,
      },
    }));
  };

  const removeFromCart = (itemId) => {
    setCart(prev => {
      const updated = { ...prev };
      if (updated[itemId]?.quantity > 1) {
        updated[itemId].quantity--;
      } else {
        delete updated[itemId];
      }
      return updated;
    });
  };

  const cartTotal = Object.values(cart).reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartCount = Object.values(cart).reduce((sum, item) => sum + (item.quantity || 0), 0);

  const handleCheckout = async () => {
    if (cartCount === 0) return;
    setProcessing(true);
    try {
      const res = await base44.functions.invoke('getWixConfig', {});
      const siteId = res.data.siteId;
      // Redirect to Wix restaurant ordering
      const orderUrl = `https://${siteId}.wixsite.com/restaurant-order`;
      window.location.href = orderUrl;
    } catch (err) {
      console.error('Checkout error:', err);
    }
    setProcessing(false);
  };

  const now = new Date();
  const pickupTimes = [];
  for (let i = 1; i <= 5; i++) {
    const time = new Date(now.getTime() + i * 30 * 60000);
    pickupTimes.push(time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
  }

  return (
    <div className="min-h-screen bg-background font-body">
      <Header />
      <div className="pt-28 px-[6vw] md:px-[8vw] pb-20">
        <Link to="/explore" className="inline-flex items-center gap-2 text-sm font-mono text-muted-foreground hover:text-primary transition-colors mb-10">
          <ArrowLeft className="w-4 h-4" /> Back to Explore
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <p className="font-mono text-xs tracking-widest uppercase text-primary mb-2">★ Ship's Galley ★</p>
          <h1 className="font-display text-5xl md:text-7xl tracking-widest text-foreground uppercase mb-2">Restaurant</h1>
          <p className="text-muted-foreground font-body mb-14">Gourmet dining at 10,000 leagues under the sea</p>
        </motion.div>

        <div className="grid lg:grid-cols-[1fr_380px] gap-10">
          <div>
            {/* Category filters */}
            <div className="flex flex-wrap gap-3 mb-8">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-4 py-2 text-xs font-mono tracking-widest uppercase border transition-colors ${
                  selectedCategory === 'all'
                    ? 'border-primary text-primary bg-primary/10'
                    : 'border-border text-muted-foreground hover:border-primary/40'
                }`}
              >
                All
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 text-xs font-mono tracking-widest uppercase border transition-colors ${
                    selectedCategory === cat
                      ? 'border-primary text-primary bg-primary/10'
                      : 'border-border text-muted-foreground hover:border-primary/40'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Menu items */}
            {loading ? (
              <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" /></div>
            ) : filteredItems.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">No menu items available.</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-6">
                {filteredItems.map((item, i) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-card border border-border p-5"
                  >
                    {item.image && (
                      <img src={item.image} alt={item.name} className="w-full h-40 object-cover rounded mb-3" />
                    )}
                    <h3 className="font-display text-lg tracking-wider text-foreground uppercase mb-1">{item.name}</h3>
                    <p className="text-muted-foreground text-sm mb-3 line-clamp-2">{item.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-primary font-mono text-sm">{item.price} {item.currency}</span>
                      <div className="flex items-center gap-2">
                        {cart[item.id] ? (
                          <>
                            <button
                              onClick={() => removeFromCart(item.id)}
                              className="w-7 h-7 flex items-center justify-center border border-border hover:border-primary transition-colors"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-sm font-mono w-6 text-center">{cart[item.id].quantity}</span>
                            <button
                              onClick={() => addToCart(item)}
                              className="w-7 h-7 flex items-center justify-center border border-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => addToCart(item)}
                            className="px-3 py-1.5 text-xs font-mono uppercase border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                          >
                            Add
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Cart sidebar */}
          <div className="lg:sticky lg:top-28 h-fit">
            <div className="bg-card border border-border p-6">
              <h3 className="font-display text-xl tracking-widest text-primary uppercase mb-5 flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" /> Your Order
              </h3>

              {cartCount === 0 ? (
                <p className="text-sm text-muted-foreground">Your cart is empty</p>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {Object.values(cart).map(item => (
                      <div key={item.id} className="flex items-center justify-between text-sm">
                        <div>
                          <div className="font-body">{item.name}</div>
                          <div className="text-xs text-muted-foreground">{item.quantity} × {item.price} {item.currency}</div>
                        </div>
                        <div className="text-primary font-mono">{item.price * item.quantity} {item.currency}</div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-border pt-4">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm text-muted-foreground">Total</span>
                      <span className="text-lg font-mono text-primary">{cartTotal} {menuItems[0]?.currency || 'USD'}</span>
                    </div>

                    <div className="mb-4">
                      <label className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
                        <Clock className="w-3 h-3" /> Pickup Time
                      </label>
                      <select
                        value={pickupTime}
                        onChange={(e) => setPickupTime(e.target.value)}
                        className="w-full bg-background border border-border rounded px-3 py-2 text-sm font-body focus:outline-none focus:border-primary"
                      >
                        <option value="">Select a time</option>
                        {pickupTimes.map(time => (
                          <option key={time} value={time}>{time}</option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={handleCheckout}
                      disabled={!pickupTime || processing}
                      className="w-full bg-primary text-primary-foreground py-3 font-mono text-sm tracking-widest uppercase hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      {processing ? 'Processing...' : 'Place Order'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
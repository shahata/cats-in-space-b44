import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import Header from '../components/Header';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock, Utensils, ShoppingBag } from 'lucide-react';

const MENU_ITEMS = [
  {
    id: '1',
    name: 'Nebula Nachos',
    description: 'Crispy asteroid chips topped with meteor cheese, solar salsa, and zero-gravity sour cream',
    price: '₪45',
    category: 'Appetizers',
    image: 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=800&q=80',
  },
  {
    id: '2',
    name: 'Quantum Tuna Melt',
    description: 'Superposition tuna salad melted between two slices of parallel universe bread',
    price: '₪65',
    category: 'Main Course',
    image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=800&q=80',
  },
  {
    id: '3',
    name: 'Black Hole Burger',
    description: 'Charcoal bun with nebula beef patty, event horizon cheese, and singularity sauce',
    price: '₪78',
    category: 'Main Course',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80',
  },
  {
    id: '4',
    name: 'Supernova Salad',
    description: 'Exploding with flavor: stellar greens, asteroid tomatoes, and galaxy dressing',
    price: '₪52',
    category: 'Salads',
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80',
  },
  {
    id: '5',
    name: 'Warp Speed Wings',
    description: 'Faster-than-light chicken wings with your choice of quantum flavors',
    price: '₪58',
    category: 'Appetizers',
    image: 'https://images.unsplash.com/photo-1608039829572-78524f79c4c7?w=800&q=80',
  },
  {
    id: '6',
    name: 'Cosmic Cheesecake',
    description: 'Swirling galaxy patterns on a meteorite crust with stardust topping',
    price: '₪42',
    category: 'Desserts',
    image: 'https://images.unsplash.com/photo-1533134242113-99a1f19a80f6?w=800&q=80',
  },
];

const CATEGORIES = ['All', 'Appetizers', 'Main Course', 'Salads', 'Desserts'];

export default function Restaurant() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cart, setCart] = useState([]);
  const [pickupTime, setPickupTime] = useState('');

  const filteredItems = selectedCategory === 'All' 
    ? MENU_ITEMS 
    : MENU_ITEMS.filter(item => item.category === selectedCategory);

  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId) => {
    setCart(prev => prev.filter(i => i.id !== itemId));
  };

  const total = cart.reduce((sum, item) => {
    const price = parseFloat(item.price.replace('₪', ''));
    return sum + (price * item.quantity);
  }, 0);

  const handleOrder = async () => {
    if (cart.length === 0) {
      alert('Your cart is empty');
      return;
    }
    if (!pickupTime) {
      alert('Please select a pickup time');
      return;
    }

    try {
      // Create cart in Wix and redirect to checkout
      const siteId = await base44.functions.invoke('getWixConfig', {}).then(r => r.data.siteId);
      if (siteId) {
        window.open(`https://${siteId}.wixsite.com/store`, '_blank');
      }
    } catch (err) {
      console.error('Order error:', err);
    }
  };

  return (
    <div className="min-h-screen bg-background font-body">
      <Header />
      <div className="pt-28 px-[6vw] md:px-[8vw] pb-20">
        <Link to="/explore" className="inline-flex items-center gap-2 text-sm font-mono text-muted-foreground hover:text-primary transition-colors mb-10">
          <ArrowLeft className="w-4 h-4" /> Back to Ship
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <p className="font-mono text-xs tracking-widest uppercase text-primary mb-2">★ Deck 5 ★</p>
          <h1 className="font-display text-5xl md:text-7xl tracking-widest text-foreground uppercase mb-2">The Cosmic Kitchen</h1>
          <p className="text-muted-foreground mb-14">Intergalactic cuisine for the discerning feline explorer</p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-10">
          {/* Menu */}
          <div className="lg:col-span-2">
            {/* Categories */}
            <div className="flex flex-wrap gap-2 mb-8">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 text-xs font-mono border transition-colors ${
                    selectedCategory === cat
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border text-muted-foreground hover:border-primary/50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Menu Items */}
            <div className="grid sm:grid-cols-2 gap-6">
              {filteredItems.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-card border border-border overflow-hidden"
                >
                  <img src={item.image} alt={item.name} className="w-full h-40 object-cover" />
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-display text-lg tracking-wider text-primary uppercase">{item.name}</h3>
                      <span className="text-primary font-bold">{item.price}</span>
                    </div>
                    <p className="text-muted-foreground text-sm mb-4">{item.description}</p>
                    <button
                      onClick={() => addToCart(item)}
                      className="w-full py-2 text-xs font-mono uppercase border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                    >
                      Add to Order
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Cart */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
            <div className="bg-card border border-border p-6 sticky top-28">
              <h2 className="font-display text-2xl tracking-widest text-primary uppercase mb-6 flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" /> Your Order
              </h2>

              {cart.length === 0 ? (
                <p className="text-muted-foreground text-sm mb-4">Your cart is empty</p>
              ) : (
                <div className="space-y-3 mb-6">
                  {cart.map(item => (
                    <div key={item.id} className="flex justify-between items-center text-sm">
                      <div>
                        <p className="font-body text-foreground">{item.name}</p>
                        <p className="text-xs text-muted-foreground">x{item.quantity}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-primary font-bold">₪{(parseFloat(item.price.replace('₪', '')) * item.quantity).toFixed(2)}</span>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="text-muted-foreground hover:text-destructive text-xs"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="border-t border-border pt-3">
                    <div className="flex justify-between font-bold">
                      <span className="text-foreground">Total:</span>
                      <span className="text-primary">₪{total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="mb-6">
                <label className="block text-xs font-mono text-muted-foreground uppercase mb-2">
                  <Clock className="w-3 h-3 inline mr-1" /> Pickup Time
                </label>
                <input
                  type="time"
                  value={pickupTime}
                  onChange={(e) => setPickupTime(e.target.value)}
                  className="w-full bg-background border border-border px-4 py-3 text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <button
                onClick={handleOrder}
                disabled={cart.length === 0 || !pickupTime}
                className="w-full py-4 bg-primary text-primary-foreground font-display text-lg tracking-widest uppercase transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/80"
              >
                Place Order
              </button>

              <p className="text-xs text-muted-foreground text-center mt-3">
                Order ahead and pick up at Deck 5
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import Header from '../components/Header';
import { motion } from 'framer-motion';
import { ArrowLeft, ShoppingBag, Clock, Plus, Minus, UtensilsCrossed, Calendar } from 'lucide-react';

export default function Restaurant() {
  const [activeTab, setActiveTab] = useState('order'); // 'order' or 'reservations'
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [cart, setCart] = useState({});
  const [pickupTime, setPickupTime] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  
  // Reservation state
  const [resDate, setResDate] = useState('');
  const [resTime, setResTime] = useState('');
  const [partySize, setPartySize] = useState(2);
  const [resLoading, setResLoading] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [reservationData, setReservationData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    notes: '',
  });

  useEffect(() => {
    if (activeTab === 'order') {
      base44.functions.invoke('getWixMenuSections', { includeItems: true })
        .then(res => {
          const sections = res.data.sections || [];
          const menuStructure = res.data.menuStructure || [];
          const allItems = res.data.items || [];
          
          setMenuItems(allItems);
          setCategories(sections.map(s => s.name));
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [activeTab]);

  useEffect(() => {
    if (resDate && activeTab === 'reservations') {
      setResLoading(true);
      base44.functions.invoke('getWixReservations', { 
        action: 'getTimeSlots', 
        date: resDate, 
        partySize 
      })
        .then(res => setAvailableSlots(res.data.slots || []))
        .catch(() => {})
        .finally(() => setResLoading(false));
    }
  }, [resDate, partySize, activeTab]);

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
      const res = await base44.functions.invoke('createRestaurantOrder', {
        items: Object.values(cart),
        pickupTime,
      });
      if (res.data.checkoutUrl) {
        window.location.href = res.data.checkoutUrl;
      }
    } catch (err) {
      console.error('Checkout error:', err);
    }
    setProcessing(false);
  };

  const handleReservation = async () => {
    if (!resDate || !resTime || !reservationData.firstName || !reservationData.email) return;
    setProcessing(true);
    try {
      const endDate = new Date(`${resDate}T${resTime}`);
      endDate.setHours(endDate.getHours() + 2);
      
      const res = await base44.functions.invoke('getWixReservations', {
        action: 'createReservation',
        reservationData: {
          locationId: 'default', // Will use default location
          startDate: `${resDate}T${resTime}`,
          endDate: endDate.toISOString(),
          partySize,
          ...reservationData,
        },
      });
      
      if (res.data.reservation) {
        alert('Reservation confirmed! Check your email for details.');
        setResDate('');
        setResTime('');
        setReservationData({ firstName: '', lastName: '', email: '', phone: '', notes: '' });
      }
    } catch (err) {
      console.error('Reservation error:', err);
      alert('Reservation failed. Please try again.');
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
          <p className="text-muted-foreground font-body mb-8">Gourmet dining at 10,000 leagues under the sea</p>
          
          {/* Tabs */}
          <div className="flex gap-4 mb-10">
            <button
              onClick={() => setActiveTab('order')}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-mono tracking-widest uppercase border transition-colors ${
                activeTab === 'order'
                  ? 'border-primary text-primary bg-primary/10'
                  : 'border-border text-muted-foreground hover:border-primary/40'
              }`}
            >
              <UtensilsCrossed className="w-4 h-4" />
              Order Food
            </button>
            <button
              onClick={() => setActiveTab('reservations')}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-mono tracking-widest uppercase border transition-colors ${
                activeTab === 'reservations'
                  ? 'border-primary text-primary bg-primary/10'
                  : 'border-border text-muted-foreground hover:border-primary/40'
              }`}
            >
              <Calendar className="w-4 h-4" />
              Table Reservations
            </button>
          </div>
        </motion.div>

        {activeTab === 'order' && (
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
        )}

        {activeTab === 'reservations' && (
        <div className="max-w-2xl">
          <div className="bg-card border border-border p-8">
            <h3 className="font-display text-2xl tracking-widest text-primary uppercase mb-6">Reserve a Table</h3>
            
            <div className="grid sm:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
                  <Calendar className="w-3 h-3" /> Date
                </label>
                <input
                  type="date"
                  value={resDate}
                  onChange={(e) => setResDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full bg-background border border-border rounded px-3 py-2 text-sm font-body focus:outline-none focus:border-primary"
                />
              </div>
              
              <div>
                <label className="text-xs text-muted-foreground mb-2">Party Size</label>
                <select
                  value={partySize}
                  onChange={(e) => setPartySize(parseInt(e.target.value))}
                  className="w-full bg-background border border-border rounded px-3 py-2 text-sm font-body focus:outline-none focus:border-primary"
                >
                  {[1,2,3,4,5,6,7,8,9,10].map(n => (
                    <option key={n} value={n}>{n} {n === 1 ? 'guest' : 'guests'}</option>
                  ))}
                </select>
              </div>
            </div>

            {resDate && (
              <div className="mb-6">
                <label className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
                  <Clock className="w-3 h-3" /> Available Times
                </label>
                {resLoading ? (
                  <div className="flex justify-center py-4"><div className="w-5 h-5 border-2 border-border border-t-primary rounded-full animate-spin" /></div>
                ) : availableSlots.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No available times for this date</p>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {availableSlots.map((slot, i) => (
                      <button
                        key={i}
                        onClick={() => setResTime(slot.startTime)}
                        className={`text-xs px-3 py-2 border rounded transition-colors ${
                          resTime === slot.startTime
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border hover:border-primary/40'
                        }`}
                      >
                        {slot.startTime}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {resTime && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1">First Name *</label>
                    <input
                      type="text"
                      value={reservationData.firstName}
                      onChange={(e) => setReservationData({...reservationData, firstName: e.target.value})}
                      className="w-full bg-background border border-border rounded px-3 py-2 text-sm font-body focus:outline-none focus:border-primary"
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1">Last Name</label>
                    <input
                      type="text"
                      value={reservationData.lastName}
                      onChange={(e) => setReservationData({...reservationData, lastName: e.target.value})}
                      className="w-full bg-background border border-border rounded px-3 py-2 text-sm font-body focus:outline-none focus:border-primary"
                      placeholder="Doe"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1">Email *</label>
                    <input
                      type="email"
                      value={reservationData.email}
                      onChange={(e) => setReservationData({...reservationData, email: e.target.value})}
                      className="w-full bg-background border border-border rounded px-3 py-2 text-sm font-body focus:outline-none focus:border-primary"
                      placeholder="john@example.com"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1">Phone</label>
                    <input
                      type="tel"
                      value={reservationData.phone}
                      onChange={(e) => setReservationData({...reservationData, phone: e.target.value})}
                      className="w-full bg-background border border-border rounded px-3 py-2 text-sm font-body focus:outline-none focus:border-primary"
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground mb-1">Special Requests</label>
                  <textarea
                    value={reservationData.notes}
                    onChange={(e) => setReservationData({...reservationData, notes: e.target.value})}
                    className="w-full bg-background border border-border rounded px-3 py-2 text-sm font-body focus:outline-none focus:border-primary h-20 resize-none"
                    placeholder="Birthday celebration, allergies, etc."
                  />
                </div>

                <button
                  onClick={handleReservation}
                  disabled={processing || !reservationData.firstName || !reservationData.email}
                  className="w-full bg-primary text-primary-foreground py-3 font-mono text-sm tracking-widest uppercase hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {processing ? 'Processing...' : 'Confirm Reservation'}
                </button>
              </div>
            )}
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
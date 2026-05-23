import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import Header from '../components/Header';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { motion } from 'framer-motion';
import { ArrowLeft, MapPin, Plus, Minus, Calendar } from 'lucide-react';
import { format } from 'date-fns';

const formatShowtime = (iso) => {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
    });
  } catch { return iso; }
};

const currencySymbol = (c) => c === 'ILS' ? '₪' : c === 'USD' ? '$' : (c || '');

export default function CinemaMovie() {
  const { slug } = useParams();
  const [allEvents, setAllEvents] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [selectedShowtimeId, setSelectedShowtimeId] = useState('');
  const [selectedDate, setSelectedDate] = useState(null);
  const [dateOpen, setDateOpen] = useState(false);
  const [quantities, setQuantities] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingTickets, setLoadingTickets] = useState(false);

  useEffect(() => {
    base44.functions.invoke('getWixEvents', {})
      .then(res => setAllEvents(res.data.events || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Find all showtimes matching this movie slug
  const showtimes = useMemo(
    () => allEvents.filter(e => (e.slug || e.id) === slug || e.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-') === slug),
    [allEvents, slug]
  );

  // Filter showtimes by selected date
  const filteredShowtimes = useMemo(() => {
    if (!selectedDate) return showtimes;
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return showtimes.filter(s => s.startDate === dateStr);
  }, [showtimes, selectedDate]);

  const movie = showtimes[0];

  useEffect(() => {
    if (!selectedShowtimeId && showtimes.length > 0) {
      setSelectedShowtimeId(showtimes[0].id);
    }
  }, [showtimes, selectedShowtimeId]);

  useEffect(() => {
    if (!selectedShowtimeId) return;
    setLoadingTickets(true);
    base44.functions.invoke('getWixEventTickets', { eventId: selectedShowtimeId })
      .then(res => setTickets(res.data.tickets || []))
      .catch(() => setTickets([]))
      .finally(() => setLoadingTickets(false));
  }, [selectedShowtimeId]);

  const updateQty = (id, delta) => {
    setQuantities(prev => {
      const next = Math.max(0, (prev[id] || 0) + delta);
      return { ...prev, [id]: next };
    });
  };

  const totalQty = Object.values(quantities).reduce((s, q) => s + q, 0);
  const totalPrice = tickets.reduce((s, t) => s + (quantities[t.id] || 0) * t.price, 0);
  const currency = tickets[0]?.currency || movie?.currency || 'USD';

  const handleCheckout = async () => {
    if (!selectedShowtimeId || totalQty === 0) return;
    const showtime = filteredShowtimes.find(s => s.id === selectedShowtimeId) || showtimes[0];
    try {
      const res = await base44.functions.invoke('createWixRedirectSession', {
        flowType: 'eventsCheckout',
        params: {
          eventSlug: showtime?.slug || slug,
          eventId: selectedShowtimeId,
        },
      });
      if (res.data?.redirectUrl) {
        window.location.href = res.data.redirectUrl;
      }
    } catch (e) { console.error(e); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="min-h-screen bg-background font-body">
        <Header />
        <div className="pt-28 px-[6vw] md:px-[8vw] text-center">
          <p className="text-muted-foreground mb-4">Movie not found.</p>
          <Link to="/cinema" className="text-primary hover:underline">← Back to movies</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-body">
      <Header />
      <div className="pt-28 px-[6vw] md:px-[8vw] pb-20">
        <Link to="/cinema" className="inline-flex items-center gap-2 text-sm font-mono text-muted-foreground hover:text-primary transition-colors mb-10">
          <ArrowLeft className="w-4 h-4" /> Back to Movies
        </Link>

        <div className="grid lg:grid-cols-[1fr_1.5fr] gap-10 mb-16">
          {/* Poster */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            {movie.image ? (
              <img src={movie.image} alt={movie.name} className="w-full aspect-[2/3] object-cover border border-border" />
            ) : (
              <div className="w-full aspect-[2/3] bg-muted flex items-center justify-center text-8xl">🎬</div>
            )}
          </motion.div>

          {/* Info */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <h1 className="font-display text-4xl md:text-6xl tracking-widest text-primary uppercase mb-4">{movie.name}</h1>
            {movie.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-5">
                {movie.tags.map(tag => (
                  <span key={tag} className="text-xs font-mono uppercase px-3 py-1 bg-primary/10 text-primary rounded-sm">
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <p className="text-muted-foreground leading-relaxed mb-6 max-w-2xl">{movie.description}</p>
            {movie.location && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4 text-primary" />
                {movie.location}
              </div>
            )}
          </motion.div>
        </div>

        {/* Showtimes selector */}
        <div className="border-t border-border pt-10">
          <h2 className="font-display text-2xl md:text-3xl tracking-widest text-primary uppercase mb-6">Buy Tickets</h2>

          <div className="bg-card border border-border p-5 mb-6 space-y-4">
            <div>
              <label className="text-xs font-mono tracking-widest uppercase text-muted-foreground mb-2 flex items-center gap-2">
                <Calendar className="w-3 h-3" /> Select Date
              </label>
              <Popover open={dateOpen} onOpenChange={setDateOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-body">
                    <Calendar className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      setSelectedDate(date);
                      setDateOpen(false);
                      setSelectedShowtimeId('');
                      setQuantities({});
                    }}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {selectedDate && (
              <div>
                <label className="text-xs font-mono tracking-widest uppercase text-muted-foreground mb-2 block">
                  Select Showtime
                </label>
                <select
                  value={selectedShowtimeId}
                  onChange={(e) => { setSelectedShowtimeId(e.target.value); setQuantities({}); }}
                  className="w-full bg-background border border-border px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-primary"
                >
                  <option value="">Pick a time</option>
                  {filteredShowtimes.map(s => (
                    <option key={s.id} value={s.id}>{formatShowtime(s.startDateISO)}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Tickets */}
          {loadingTickets ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" />
            </div>
          ) : tickets.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No tickets available for this showtime.</p>
          ) : (
            <div className="space-y-3">
              {tickets.map(t => (
                <div key={t.id} className="bg-card border border-border p-5 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display text-lg tracking-wider text-foreground uppercase mb-1">{t.name}</h3>
                    {t.description && <p className="text-muted-foreground text-xs mb-2">{t.description}</p>}
                    <p className="text-primary font-mono">{currencySymbol(t.currency)}{t.price.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => updateQty(t.id, -1)}
                      className="w-8 h-8 flex items-center justify-center border border-border hover:border-primary transition-colors"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-8 text-center font-mono">{quantities[t.id] || 0}</span>
                    <button
                      onClick={() => updateQty(t.id, 1)}
                      className="w-8 h-8 flex items-center justify-center border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}

              {totalQty > 0 && (
                <div className="bg-card border border-primary p-5 flex items-center justify-between sticky bottom-4 mt-6">
                  <div>
                    <div className="text-xs font-mono tracking-widest uppercase text-muted-foreground mb-1">
                      {totalQty} Ticket{totalQty !== 1 ? 's' : ''}
                    </div>
                    <div className="font-mono text-xl text-primary">{currencySymbol(currency)}{totalPrice.toFixed(2)}</div>
                  </div>
                  <button
                    onClick={handleCheckout}
                    className="bg-primary text-primary-foreground px-6 py-3 font-mono text-sm tracking-widest uppercase hover:bg-primary/90 transition-colors"
                  >
                    Checkout
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import Header from '../components/Header';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, Clock, Ticket } from 'lucide-react';

const SCREENINGS = [
  {
    id: '1',
    title: 'Star Paws',
    description: 'A heroic cat embarks on a mission to save the galaxy from the evil Dog Empire. "The purr-fect space opera!" - Meow York Times',
    rating: 'PG',
    duration: '127 min',
    genre: 'Sci-Fi Adventure',
    poster: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&q=80',
    showtimes: ['14:00', '17:30', '20:00'],
    price: '₪35',
  },
  {
    id: '2',
    title: 'The Meowtrix',
    description: 'A computer hacker cat discovers reality as we know it is actually a simulation created by sentient mice.',
    rating: 'PG-13',
    duration: '142 min',
    genre: 'Sci-Fi Action',
    poster: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=800&q=80',
    showtimes: ['15:30', '18:45', '21:15'],
    price: '₪35',
  },
  {
    id: '3',
    title: 'Cat-ablanca',
    description: 'A cynical cat cafe owner in Casablanca must choose between love and helping her former lover escape.',
    rating: 'PG',
    duration: '102 min',
    genre: 'Classic Romance',
    poster: 'https://images.unsplash.com/photo-1517604931442-71053e3e2c28?w=800&q=80',
    showtimes: ['13:00', '16:00', '19:30'],
    price: '₪30',
  },
  {
    id: '4',
    title: 'Nine Lives',
    description: 'A documentary exploring the mysterious phenomenon of feline regeneration and its implications for space travel.',
    rating: 'G',
    duration: '85 min',
    genre: 'Documentary',
    poster: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800&q=80',
    showtimes: ['12:00', '14:30', '17:00'],
    price: '₪25',
  },
];

export default function Cinema() {
  const [selectedScreening, setSelectedScreening] = useState(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [ticketCount, setTicketCount] = useState(1);
  const [selectedDate, setSelectedDate] = useState('');

  const handleBookTickets = async () => {
    if (!selectedScreening || !selectedTime || !selectedDate || ticketCount < 1) {
      alert('Please select a movie, date, time, and number of tickets');
      return;
    }

    try {
      // Redirect to Wix events/booking page
      const siteId = await base44.functions.invoke('getWixConfig', {}).then(r => r.data.siteId);
      if (siteId) {
        window.open(`https://${siteId}.wixsite.com/events`, '_blank');
      }
    } catch (err) {
      console.error('Booking error:', err);
    }
  };

  const totalPrice = selectedScreening 
    ? (parseFloat(selectedScreening.price.replace('₪', '')) * ticketCount).toFixed(2)
    : '0';

  return (
    <div className="min-h-screen bg-background font-body">
      <Header />
      <div className="pt-28 px-[6vw] md:px-[8vw] pb-20">
        <Link to="/explore" className="inline-flex items-center gap-2 text-sm font-mono text-muted-foreground hover:text-primary transition-colors mb-10">
          <ArrowLeft className="w-4 h-4" /> Back to Ship
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <p className="font-mono text-xs tracking-widest uppercase text-primary mb-2">★ Deck 7 ★</p>
          <h1 className="font-display text-5xl md:text-7xl tracking-widest text-foreground uppercase mb-2">The Nebula Theater</h1>
          <p className="text-muted-foreground mb-14">Weekly screenings of cat-themed classics — every weeknight at 20:00</p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-10">
          {/* Screenings List */}
          <div className="lg:col-span-2 space-y-6">
            {SCREENINGS.map((screening, i) => (
              <motion.div
                key={screening.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                onClick={() => {
                  setSelectedScreening(screening);
                  setSelectedTime('');
                }}
                className={`flex gap-4 p-4 border cursor-pointer transition-all ${
                  selectedScreening?.id === screening.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-card hover:border-primary/40'
                }`}
              >
                <img 
                  src={screening.poster} 
                  alt={screening.title} 
                  className="w-24 h-36 object-cover rounded-lg flex-shrink-0" 
                />
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-display text-xl tracking-wider text-primary uppercase">{screening.title}</h3>
                    <span className="text-primary font-bold">{screening.price}</span>
                  </div>
                  <p className="text-muted-foreground text-sm mb-3">{screening.description}</p>
                  <div className="flex flex-wrap gap-3 text-xs font-mono text-foreground/70 mb-3">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {screening.duration}
                    </span>
                    <span className="px-2 py-0.5 border border-border rounded">{screening.rating}</span>
                    <span>{screening.genre}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {screening.showtimes.map(time => (
                      <span
                        key={time}
                        className={`px-3 py-1 text-xs font-mono border ${
                          selectedScreening?.id === screening.id && selectedTime === time
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'border-border text-muted-foreground'
                        }`}
                      >
                        {time}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Booking Form */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
            <div className="bg-card border border-border p-6 sticky top-28">
              <h2 className="font-display text-2xl tracking-widest text-primary uppercase mb-6 flex items-center gap-2">
                <Ticket className="w-5 h-5" /> Book Tickets
              </h2>

              {selectedScreening ? (
                <>
                  <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                    <p className="font-display text-lg text-primary uppercase">{selectedScreening.title}</p>
                    <p className="text-sm text-muted-foreground">{selectedScreening.duration} • {selectedScreening.genre}</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-mono text-muted-foreground uppercase mb-2">
                        <Calendar className="w-3 h-3 inline mr-1" /> Date
                      </label>
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full bg-background border border-border px-4 py-3 text-sm focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-mono text-muted-foreground uppercase mb-2">
                        <Clock className="w-3 h-3 inline mr-1" /> Showtime
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {selectedScreening.showtimes.map(time => (
                          <button
                            key={time}
                            onClick={() => setSelectedTime(time)}
                            className={`py-2 text-xs font-mono border transition-colors ${
                              selectedTime === time
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'border-border text-muted-foreground hover:border-primary/50'
                            }`}
                          >
                            {time}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-mono text-muted-foreground uppercase mb-2">Tickets</label>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setTicketCount(Math.max(1, ticketCount - 1))}
                          className="w-10 h-10 border border-border flex items-center justify-center hover:border-primary transition-colors"
                        >
                          -
                        </button>
                        <span className="w-12 text-center font-display text-lg text-primary">{ticketCount}</span>
                        <button
                          onClick={() => setTicketCount(Math.min(10, ticketCount + 1))}
                          className="w-10 h-10 border border-border flex items-center justify-center hover:border-primary transition-colors"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="border-t border-border pt-4">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-muted-foreground">Total:</span>
                        <span className="font-display text-2xl text-primary">₪{totalPrice}</span>
                      </div>

                      <button
                        onClick={handleBookTickets}
                        disabled={!selectedDate || !selectedTime}
                        className="w-full py-4 bg-primary text-primary-foreground font-display text-lg tracking-widest uppercase transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/80"
                      >
                        Book Now
                      </button>

                      <p className="text-xs text-muted-foreground text-center mt-3">
                        You'll be redirected to complete your booking
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground text-sm">Select a movie to book tickets</p>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
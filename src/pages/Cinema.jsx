import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import Header from '../components/Header';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, Clock, MapPin, Ticket } from 'lucide-react';

export default function Cinema() {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [ticketCount, setTicketCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    base44.functions.invoke('getWixEvents', {})
      .then(res => setEvents(res.data.events || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleBook = async () => {
    if (!selectedEvent || !selectedDate || !selectedTime) return;
    setBooking(true);
    try {
      const res = await base44.functions.invoke('getWixConfig', {});
      const siteId = res.data.siteId;
      // Redirect to Wix events - use proper URL format
      const bookingUrl = `https://www.wix.com/events?siteId=${siteId}&eventId=${selectedEvent.id}&date=${selectedDate}&time=${selectedTime}&tickets=${ticketCount}`;
      window.location.href = bookingUrl;
    } catch (err) {
      console.error('Booking error:', err);
    }
    setBooking(false);
  };

  const today = new Date().toISOString().split('T')[0];

  // Extract unique dates from events
  const availableDates = [...new Set(events.map(e => e.startDate).filter(Boolean))];

  // Extract times for selected date
  const eventsOnDate = events.filter(e => e.startDate === selectedDate);
  const availableTimes = [...new Set(eventsOnDate.map(e => e.startTime))];

  return (
    <div className="min-h-screen bg-background font-body">
      <Header />
      <div className="pt-28 px-[6vw] md:px-[8vw] pb-20">
        <Link to="/explore" className="inline-flex items-center gap-2 text-sm font-mono text-muted-foreground hover:text-primary transition-colors mb-10">
          <ArrowLeft className="w-4 h-4" /> Back to Explore
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <p className="font-mono text-xs tracking-widest uppercase text-primary mb-2">★ Nebula Theater ★</p>
          <h1 className="font-display text-5xl md:text-7xl tracking-widest text-foreground uppercase mb-2">Cinema</h1>
          <p className="text-muted-foreground font-body mb-14">Blockbuster entertainment among the stars</p>
        </motion.div>

        <div className="grid lg:grid-cols-[1fr_400px] gap-10">
          <div>
            <h2 className="font-display text-2xl tracking-widest text-primary uppercase mb-6">Now Showing</h2>
            {loading ? (
              <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" /></div>
            ) : events.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">No screenings available at the moment.</p>
            ) : (
              <div className="space-y-4">
                {events.map((event, i) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => setSelectedEvent(event)}
                    className={`cursor-pointer p-5 border transition-all flex gap-4 ${
                      selectedEvent?.id === event.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/40'
                    }`}
                  >
                    {event.image && (
                      <img src={event.image} alt={event.name} className="w-32 h-20 object-cover rounded flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <h3 className="font-display text-lg tracking-wider text-foreground uppercase mb-1">{event.name}</h3>
                      <p className="text-muted-foreground text-sm mb-2 line-clamp-2">{event.description}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {(event.startDate || event.schedule?.startDate) && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {(event.startDate || event.schedule.startDate).split('T')[0]}
                          </span>
                        )}
                        {(event.startTime || event.schedule?.startTime) && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {event.startTime || event.schedule.startTime}
                          </span>
                        )}
                        {event.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {event.location}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-primary font-mono text-sm mb-1">{event.price} {event.currency}</div>
                      {event.availableTickets !== undefined && (
                        <div className="text-xs text-muted-foreground">
                          {event.availableTickets} seats left
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          <div className="lg:sticky lg:top-28 h-fit">
            <div className="bg-card border border-border p-6">
              <h3 className="font-display text-xl tracking-widest text-primary uppercase mb-5 flex items-center gap-2">
                <Ticket className="w-5 h-5" /> Book Tickets
              </h3>

              {!selectedEvent ? (
                <p className="text-sm text-muted-foreground">Select a screening to continue</p>
              ) : (
                <div className="space-y-4">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Selected</div>
                    <div className="text-primary font-mono text-sm">{selectedEvent.name}</div>
                    <div className="text-muted-foreground text-xs">
                      {selectedEvent.startDate?.split('T')[0]} • {selectedEvent.startTime}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
                      <Calendar className="w-3 h-3" /> Select Date
                    </label>
                    <select
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full bg-background border border-border rounded px-3 py-2 text-sm font-body focus:outline-none focus:border-primary"
                    >
                      <option value="">Choose a date</option>
                      {availableDates.map(date => (
                        <option key={date} value={date}>{date}</option>
                      ))}
                    </select>
                  </div>

                  {selectedDate && (
                    <div>
                      <label className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
                        <Clock className="w-3 h-3" /> Select Time
                      </label>
                      {availableTimes.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No showtimes for this date</p>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          {availableTimes.map(time => (
                            <button
                              key={time}
                              onClick={() => setSelectedTime(time)}
                              className={`text-xs px-3 py-2 border rounded transition-colors ${
                                selectedTime === time
                                  ? 'border-primary bg-primary/10 text-primary'
                                  : 'border-border hover:border-primary/40'
                              }`}
                            >
                              {time}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {selectedTime && (
                    <div>
                      <label className="text-xs text-muted-foreground mb-2">Number of Tickets</label>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setTicketCount(Math.max(1, ticketCount - 1))}
                          className="w-8 h-8 flex items-center justify-center border border-border hover:border-primary transition-colors"
                        >
                          -
                        </button>
                        <span className="text-sm font-mono w-8 text-center">{ticketCount}</span>
                        <button
                          onClick={() => setTicketCount(Math.min(10, ticketCount + 1))}
                          className="w-8 h-8 flex items-center justify-center border border-border hover:border-primary transition-colors"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )}

                  {selectedTime && (
                    <div className="border-t border-border pt-4">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm text-muted-foreground">Total</span>
                        <span className="text-lg font-mono text-primary">
                          {selectedEvent.price * ticketCount} {selectedEvent.currency}
                        </span>
                      </div>

                      <button
                        onClick={handleBook}
                        disabled={booking}
                        className="w-full bg-primary text-primary-foreground py-3 font-mono text-sm tracking-widest uppercase hover:bg-primary/90 transition-colors disabled:opacity-50"
                      >
                        {booking ? 'Processing...' : 'Book Tickets'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
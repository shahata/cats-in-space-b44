import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import Header from '../components/Header';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, Clock, Search } from 'lucide-react';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

export default function MedicalBay() {
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [findingDate, setFindingDate] = useState(false);
  const [nextAvailableDate, setNextAvailableDate] = useState(null);

  useEffect(() => {
    base44.functions.invoke('getWixServices', {})
      .then(res => setServices(res.data.services || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedService && selectedDate) {
      base44.functions.invoke('getWixServiceSlots', { serviceId: selectedService.id, date: selectedDate })
        .then(res => setSlots(res.data.slots || []))
        .catch(() => {});
    }
  }, [selectedService, selectedDate]);

  const findNextAvailableDate = async () => {
    if (!selectedService) return;
    setFindingDate(true);
    setNextAvailableDate(null);
    
    try {
      // Check next 30 days
      const today = new Date();
      for (let i = 1; i <= 30; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() + i);
        const dateStr = checkDate.toISOString().split('T')[0];
        
        const res = await base44.functions.invoke('getWixServiceSlots', { 
          serviceId: selectedService.id, 
          date: dateStr 
        });
        
        if (res.data.slots && res.data.slots.length > 0) {
          setNextAvailableDate(dateStr);
          break;
        }
      }
    } catch (err) {
      console.error('Error finding date:', err);
    }
    setFindingDate(false);
  };

  const handleBook = async () => {
    if (!selectedService || !selectedDate || !selectedTime) return;
    setBooking(true);
    try {
      const slot = slots.find(s => s.startTime === selectedTime);
      const res = await base44.functions.invoke('createWixRedirectSession', {
        flowType: 'bookingsCheckout',
        params: {
          slotAvailability: {
            slot: slot?.slotData || slot || {
              serviceId: selectedService.id,
              startDate: `${selectedDate}T${selectedTime}`,
            },
            bookable: true,
          },
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      });
      if (res.data?.redirectUrl) {
        window.location.href = res.data.redirectUrl;
      } else {
        console.error('Booking redirect failed:', res.data);
      }
    } catch (err) {
      console.error('Booking error:', err);
    }
    setBooking(false);
  };

  const today = new Date();

  return (
    <div className="min-h-screen bg-background font-body">
      <Header />
      <div className="pt-28 px-[6vw] md:px-[8vw] pb-20">
        <Link to="/explore" className="inline-flex items-center gap-2 text-sm font-mono text-muted-foreground hover:text-primary transition-colors mb-10">
          <ArrowLeft className="w-4 h-4" /> Back to Explore
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <p className="font-mono text-xs tracking-widest uppercase text-primary mb-2">★ Medical Services ★</p>
          <h1 className="font-display text-5xl md:text-7xl tracking-widest text-foreground uppercase mb-2">Medical Bay</h1>
          <p className="text-muted-foreground font-body mb-14">Professional veterinary care for your feline companion</p>
        </motion.div>

        <div className="grid lg:grid-cols-[1fr_400px] gap-10">
          <div>
            <h2 className="font-display text-2xl tracking-widest text-primary uppercase mb-6">Available Services</h2>
            {loading ? (
              <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" /></div>
            ) : services.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">No services available at the moment.</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {services.map((service, i) => (
                  <motion.div
                    key={service.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => setSelectedService(service)}
                    className={`cursor-pointer p-5 border transition-all ${
                      selectedService?.id === service.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/40'
                    }`}
                  >
                    {service.image && (
                      <img src={service.image} alt={service.name} className="w-full h-32 object-cover rounded mb-3" />
                    )}
                    <h3 className="font-display text-lg tracking-wider text-foreground uppercase mb-1">{service.name}</h3>
                    <p className="text-muted-foreground text-sm mb-2 line-clamp-2">{service.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-primary font-mono text-sm">{service.price} {service.currency}</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {service.duration} min
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          <div className="lg:sticky lg:top-28 h-fit">
            <div className="bg-card border border-border p-6">
              <h3 className="font-display text-xl tracking-widest text-primary uppercase mb-5">Book Appointment</h3>
              
              {!selectedService ? (
                <p className="text-sm text-muted-foreground">Select a service to continue</p>
              ) : (
                <div className="space-y-4">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Selected Service</div>
                    <div className="text-primary font-mono text-sm">{selectedService.name}</div>
                    <div className="text-muted-foreground text-xs">{selectedService.duration} min • {selectedService.price} {selectedService.currency}</div>
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
                      <Calendar className="w-3 h-3" /> Select Date
                    </label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-body"
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {selectedDate ? format(new Date(selectedDate), 'PPP') : 'Pick a date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <CalendarComponent
                          mode="single"
                          selected={selectedDate ? new Date(selectedDate) : undefined}
                          onSelect={(date) => setSelectedDate(date ? format(date, 'yyyy-MM-dd') : '')}
                          disabled={(date) => date < new Date(today.setHours(0, 0, 0, 0))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {selectedDate && (
                    <div>
                      <label className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
                        <Clock className="w-3 h-3" /> Available Times
                      </label>
                      {slots.length === 0 ? (
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground">No available slots for this date</p>
                          <button
                            onClick={findNextAvailableDate}
                            disabled={findingDate}
                            className="w-full flex items-center justify-center gap-2 text-xs px-3 py-2 border border-primary text-primary hover:bg-primary/10 rounded transition-colors disabled:opacity-50"
                          >
                            <Search className="w-3 h-3" />
                            {findingDate ? 'Searching...' : 'Find Next Available Date'}
                          </button>
                          {nextAvailableDate && (
                            <div className="text-xs text-primary">
                              Next available: {new Date(nextAvailableDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                              <button
                                onClick={() => {
                                  setSelectedDate(nextAvailableDate);
                                  setNextAvailableDate(null);
                                }}
                                className="ml-2 underline hover:text-primary/80"
                              >
                                Go to date
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                          {slots.filter(s => s.available).map((slot, i) => (
                            <button
                              key={i}
                              onClick={() => setSelectedTime(slot.startTime)}
                              className={`text-xs px-2 py-1.5 border rounded transition-colors ${
                                selectedTime === slot.startTime
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

                  {selectedTime && (
                    <button
                      onClick={handleBook}
                      disabled={booking}
                      className="w-full bg-primary text-primary-foreground py-3 font-mono text-sm tracking-widest uppercase hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      {booking ? 'Processing...' : 'Complete Booking'}
                    </button>
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
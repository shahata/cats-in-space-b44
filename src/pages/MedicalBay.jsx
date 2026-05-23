import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import Header from '../components/Header';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, Clock } from 'lucide-react';

const SERVICES = [
  {
    id: '1',
    name: 'Routine Checkup',
    description: 'Annual wellness exam, weight check, and general health assessment',
    duration: '30 min',
    price: '₪150',
    image: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&q=80',
  },
  {
    id: '2',
    name: 'Vaccination',
    description: 'Core vaccines including rabies, feline distemper, and calicivirus',
    duration: '20 min',
    price: '₪200',
    image: 'https://images.unsplash.com/photo-1576086213369-97a306d36557?w=800&q=80',
  },
  {
    id: '3',
    name: 'Dental Cleaning',
    description: 'Professional teeth cleaning under anesthesia with full dental exam',
    duration: '60 min',
    price: '₪400',
    image: 'https://images.unsplash.com/photo-1606811971618-4486d14f3f72?w=800&q=80',
  },
  {
    id: '4',
    name: 'Hairball Treatment',
    description: 'Specialized treatment for chronic hairball issues and digestive support',
    duration: '25 min',
    price: '₪120',
    image: 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?w=800&q=80',
  },
];

export default function MedicalBay() {
  const [selectedService, setSelectedService] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');

  const handleBook = async () => {
    if (!selectedService || !selectedDate || !selectedTime) {
      alert('Please select a service, date, and time');
      return;
    }

    try {
      // Redirect to Wix booking page for the service
      const siteId = await base44.functions.invoke('getWixConfig', {}).then(r => r.data.siteId);
      if (siteId) {
        window.open(`https://${siteId}.wixsite.com/bookings`, '_blank');
      }
    } catch (err) {
      console.error('Booking error:', err);
    }
  };

  const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00',
  ];

  return (
    <div className="min-h-screen bg-background font-body">
      <Header />
      <div className="pt-28 px-[6vw] md:px-[8vw] pb-20">
        <Link to="/explore" className="inline-flex items-center gap-2 text-sm font-mono text-muted-foreground hover:text-primary transition-colors mb-10">
          <ArrowLeft className="w-4 h-4" /> Back to Ship
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <p className="font-mono text-xs tracking-widest uppercase text-primary mb-2">★ Deck 3 ★</p>
          <h1 className="font-display text-5xl md:text-7xl tracking-widest text-foreground uppercase mb-2">Medical Bay</h1>
          <p className="text-muted-foreground mb-14">Routine checkups, vaccinations, and emergency care for our brave explorers</p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-10">
          {/* Services List */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <h2 className="font-display text-2xl tracking-widest text-primary uppercase mb-6">Available Services</h2>
            <div className="space-y-4">
              {SERVICES.map((service, i) => (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  onClick={() => setSelectedService(service)}
                  className={`p-5 border cursor-pointer transition-all ${
                    selectedService?.id === service.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-card hover:border-primary/40'
                  }`}
                >
                  <div className="flex gap-4">
                    <img src={service.image} alt={service.name} className="w-20 h-20 object-cover rounded-lg flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="font-display text-lg tracking-wider text-primary uppercase mb-1">{service.name}</h3>
                      <p className="text-muted-foreground text-sm mb-2">{service.description}</p>
                      <div className="flex items-center gap-4 text-xs font-mono">
                        <span className="flex items-center gap-1 text-foreground/70">
                          <Clock className="w-3 h-3" /> {service.duration}
                        </span>
                        <span className="text-primary font-bold">{service.price}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Booking Form */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
            <div className="bg-card border border-border p-8 sticky top-28">
              <h2 className="font-display text-2xl tracking-widest text-primary uppercase mb-6">Book Appointment</h2>
              
              {selectedService ? (
                <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <p className="font-display text-lg text-primary uppercase">{selectedService.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedService.duration} • {selectedService.price}</p>
                </div>
              ) : (
                <p className="text-muted-foreground mb-6 text-sm">Select a service to begin booking</p>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-muted-foreground uppercase mb-2">Date</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full bg-background border border-border px-4 py-3 text-sm focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-muted-foreground uppercase mb-2">Time</label>
                  <div className="grid grid-cols-3 gap-2">
                    {timeSlots.map((time) => (
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

                <button
                  onClick={handleBook}
                  disabled={!selectedService || !selectedDate || !selectedTime}
                  className="w-full py-4 bg-primary text-primary-foreground font-display text-lg tracking-widest uppercase transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/80"
                >
                  Book Now
                </button>

                <p className="text-xs text-muted-foreground text-center">
                  You'll be redirected to complete your booking
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
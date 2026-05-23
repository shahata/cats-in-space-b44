import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import Header from '../components/Header';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock, Calendar, Check } from 'lucide-react';

export default function RestaurantReserve() {
  const [step, setStep] = useState(1); // 1=time, 2=details, 3=confirm
  const [resDate, setResDate] = useState('');
  const [resTime, setResTime] = useState('');
  const [partySize, setPartySize] = useState(2);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [data, setData] = useState({ firstName: '', lastName: '', email: '', phone: '', notes: '' });

  useEffect(() => {
    if (!resDate) return;
    setLoadingSlots(true);
    base44.functions.invoke('getWixReservations', { action: 'getTimeSlots', date: resDate, partySize })
      .then(res => setAvailableSlots(res.data.slots || []))
      .catch(() => {})
      .finally(() => setLoadingSlots(false));
  }, [resDate, partySize]);

  const handleConfirm = async () => {
    if (!resDate || !resTime || !data.firstName || !data.email) return;
    setProcessing(true);
    try {
      const endDate = new Date(`${resDate}T${resTime}`);
      endDate.setHours(endDate.getHours() + 2);
      const res = await base44.functions.invoke('getWixReservations', {
        action: 'createReservation',
        reservationData: {
          locationId: 'default',
          startDate: `${resDate}T${resTime}`,
          endDate: endDate.toISOString(),
          partySize,
          ...data,
        },
      });
      if (res.data?.reservation) setConfirmed(true);
    } catch (e) { console.error(e); }
    setProcessing(false);
  };

  if (confirmed) {
    return (
      <div className="min-h-screen bg-background font-body">
        <Header />
        <div className="pt-28 px-[6vw] md:px-[8vw] pb-20 text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/20 flex items-center justify-center">
            <Check className="w-10 h-10 text-primary" />
          </motion.div>
          <h1 className="font-display text-3xl md:text-5xl tracking-widest text-primary uppercase mb-3">Reservation Confirmed</h1>
          <p className="text-muted-foreground mb-2">{resDate} • {resTime} • {partySize} guests</p>
          <p className="text-muted-foreground text-sm mb-8">Check your email for the confirmation details.</p>
          <Link to="/restaurant" className="inline-block bg-primary text-primary-foreground px-6 py-3 font-mono text-sm tracking-widest uppercase hover:bg-primary/90 transition-colors">
            Back to Restaurant
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-body">
      <Header />
      <div className="pt-28 px-[6vw] md:px-[8vw] pb-20">
        <Link to="/restaurant" className="inline-flex items-center gap-2 text-sm font-mono text-muted-foreground hover:text-primary transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to Restaurant
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <h1 className="font-display text-5xl md:text-6xl tracking-widest text-primary uppercase mb-3">Reserve a Table</h1>
          <p className="text-muted-foreground">Book your spot at The Cosmic Kitchen</p>
        </motion.div>

        <div className="max-w-2xl mx-auto bg-card border border-border p-6 md:p-8">
          {/* Stepper */}
          <div className="flex items-center gap-4 mb-8 text-xs font-mono uppercase tracking-widest">
            {[
              { n: 1, label: 'Select Time' },
              { n: 2, label: 'Details' },
              { n: 3, label: 'Confirm' },
            ].map(({ n, label }) => (
              <div key={n} className={`flex items-center gap-2 ${step >= n ? 'text-primary' : 'text-muted-foreground'}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step >= n ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  {n}
                </span>
                {label}
              </div>
            ))}
          </div>

          {/* Step 1: Time */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2 block">Party Size</label>
                  <select value={partySize} onChange={(e) => setPartySize(parseInt(e.target.value))} className="w-full bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-primary">
                    {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n} {n === 1 ? 'guest' : 'guests'}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1"><Calendar className="w-3 h-3" /> Date</label>
                  <input type="date" value={resDate} min={new Date().toISOString().split('T')[0]} onChange={(e) => setResDate(e.target.value)} className="w-full bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1"><Clock className="w-3 h-3" /> Time</label>
                  <select value={resTime} onChange={(e) => setResTime(e.target.value)} disabled={!resDate} className="w-full bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-primary disabled:opacity-50">
                    <option value="">Select time</option>
                    {availableSlots.map((s, i) => <option key={i} value={s.startTime}>{s.startTime}</option>)}
                  </select>
                </div>
              </div>

              {resDate && loadingSlots && (
                <div className="flex justify-center py-4"><div className="w-5 h-5 border-2 border-border border-t-primary rounded-full animate-spin" /></div>
              )}

              <button
                onClick={() => setStep(2)}
                disabled={!resDate || !resTime}
                className="w-full bg-primary text-primary-foreground py-3 font-mono text-xs tracking-widest uppercase hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}

          {/* Step 2: Details */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1 block">First Name *</label>
                  <input type="text" value={data.firstName} onChange={(e) => setData({...data, firstName: e.target.value})} className="w-full bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1 block">Last Name</label>
                  <input type="text" value={data.lastName} onChange={(e) => setData({...data, lastName: e.target.value})} className="w-full bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-primary" />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1 block">Email *</label>
                  <input type="email" value={data.email} onChange={(e) => setData({...data, email: e.target.value})} className="w-full bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1 block">Phone</label>
                  <input type="tel" value={data.phone} onChange={(e) => setData({...data, phone: e.target.value})} className="w-full bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-primary" />
                </div>
              </div>
              <div>
                <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1 block">Special Requests</label>
                <textarea value={data.notes} onChange={(e) => setData({...data, notes: e.target.value})} rows={3} className="w-full bg-background border border-border px-3 py-2 text-sm resize-none focus:outline-none focus:border-primary" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 border border-border py-3 font-mono text-xs tracking-widest uppercase hover:border-primary/40 transition-colors">Back</button>
                <button onClick={() => setStep(3)} disabled={!data.firstName || !data.email} className="flex-1 bg-primary text-primary-foreground py-3 font-mono text-xs tracking-widest uppercase hover:bg-primary/90 transition-colors disabled:opacity-50">Next</button>
              </div>
            </div>
          )}

          {/* Step 3: Confirm */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="bg-background/50 border border-border p-5 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span>{resDate}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Time</span><span>{resTime}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Party</span><span>{partySize} guests</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span>{data.firstName} {data.lastName}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span>{data.email}</span></div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="flex-1 border border-border py-3 font-mono text-xs tracking-widest uppercase hover:border-primary/40 transition-colors">Back</button>
                <button onClick={handleConfirm} disabled={processing} className="flex-1 bg-primary text-primary-foreground py-3 font-mono text-xs tracking-widest uppercase hover:bg-primary/90 transition-colors disabled:opacity-50">
                  {processing ? 'Processing...' : 'Confirm Reservation'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
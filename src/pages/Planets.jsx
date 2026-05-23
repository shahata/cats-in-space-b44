import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import Header from '../components/Header';
import { motion } from 'framer-motion';
import { getStatusClass } from '../lib/wixUtils';

export default function Planets() {
  const [planets, setPlanets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.functions.invoke('getWixCMSData', { collectionId: 'Planets', sort: [{ fieldName: 'habitability', order: 'DESC' }] })
      .then(res => setPlanets(res.data.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-background font-body">
      <Header />
      <div className="pt-28 px-[6vw] md:px-[8vw] pb-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <p className="font-mono text-xs tracking-widest uppercase text-primary mb-2">★ Surveyed Worlds ★</p>
          <h1 className="font-display text-5xl md:text-7xl tracking-widest text-foreground uppercase mb-2">Planet Database</h1>
          <p className="text-muted-foreground font-body mb-14">All surveyed worlds ranked by habitability for feline life</p>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-32"><div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" /></div>
        ) : planets.length === 0 ? (
          <p className="text-center text-muted-foreground py-32">No planets found.</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {planets.map((planet, i) => (
              <motion.div key={planet._id || i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                <Link to={`/planets/${planet.slug}`} className="block bg-card border border-border hover:border-primary/40 transition-all group p-6">
                  <div className="flex gap-5 items-start">
                    <span className="font-mono text-2xl text-primary/40 font-bold">#{i + 1}</span>
                    {planet.mainImage || planet.photo || planet.image ? (
                      <img src={planet.mainImage || planet.photo || planet.image} alt={planet.name || planet.title}
                        className="w-24 h-24 object-cover rounded" />
                    ) : (
                      <div className="w-24 h-24 bg-muted rounded flex items-center justify-center text-3xl">🪐</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h2 className="font-display text-2xl tracking-wider text-foreground uppercase group-hover:text-primary transition-colors">
                          {planet.name || planet.title}
                        </h2>
                        {planet.status && (
                          <span className={`text-xs font-mono px-2 py-0.5 border rounded-full ${getStatusClass(planet.status)}`}>
                            {planet.status}
                          </span>
                        )}
                      </div>
                      {planet.tagline && <p className="text-muted-foreground text-sm italic mb-3">{planet.tagline}</p>}
                      {planet.habitabilityScore != null && (
                        <div className="mb-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-mono text-muted-foreground">Habitability</span>
                            <span className="text-xs font-mono text-primary">{planet.habitabilityScore}%</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${planet.habitabilityScore}%` }} />
                          </div>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono text-muted-foreground">
                        {planet.distance && <span>Distance: <span className="text-foreground">{planet.distance}</span></span>}
                        {planet.gravity && <span>Gravity: <span className="text-foreground">{planet.gravity}</span></span>}
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
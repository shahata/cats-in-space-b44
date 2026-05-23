import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import Header from '../components/Header';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { getStatusClass } from '../lib/wixUtils';

export default function PlanetDetail() {
  const { slug } = useParams();
  const [planet, setPlanet] = useState(null);
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const planetRes = await base44.functions.invoke('getWixCMSData', { collectionId: 'Planets', slug });
      const p = planetRes.data.item || null;
      setPlanet(p);
      if (p?.title) {
        const missionsRes = await base44.functions.invoke('getWixCMSData', { collectionId: 'Missions', filter: { planet: { $eq: p.title } } });
        setMissions(missionsRes.data.items || []);
      }
      setLoading(false);
    };
    load().catch(() => setLoading(false));
  }, [slug]);

  if (loading) return (
    <div className="min-h-screen bg-background font-body">
      <Header />
      <div className="flex justify-center pt-40"><div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" /></div>
    </div>
  );

  if (!planet) return (
    <div className="min-h-screen bg-background font-body">
      <Header />
      <div className="text-center pt-40 text-muted-foreground">Planet not found. <Link to="/planets" className="text-primary hover:underline">Back to all planets</Link></div>
    </div>
  );

  const image = planet.image;

  return (
    <div className="min-h-screen bg-background font-body">
      <Header />
      <div className="pt-28 px-[6vw] md:px-[8vw] pb-20">
        <Link to="/planets" className="inline-flex items-center gap-2 text-sm font-mono text-muted-foreground hover:text-primary transition-colors mb-10">
          <ArrowLeft className="w-4 h-4" /> All Planets
        </Link>

        <div className="grid md:grid-cols-[1fr_340px] gap-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex flex-col items-center md:items-start mb-8">
              {image && <img src={image} alt={planet.name || planet.title} className="w-64 h-64 object-cover rounded-lg mb-6" />}
              <h1 className="font-display text-5xl md:text-7xl tracking-widest text-primary uppercase mb-2">{planet.name || planet.title}</h1>
              {planet.tagline && <p className="text-foreground/70 italic text-lg mb-3">{planet.tagline}</p>}
              {planet.status && (
                <span className={`text-xs font-mono px-3 py-1 border rounded-full ${getStatusClass(planet.status)}`}>{planet.status}</span>
              )}
            </div>

            {planet.description && (
              <div className="mb-10">
                <h2 className="font-display text-2xl tracking-widest text-primary uppercase mb-4">Overview</h2>
                <p className="text-foreground/80 leading-relaxed">{planet.description}</p>
              </div>
            )}

            {missions.length > 0 && (
              <div>
                <h2 className="font-display text-2xl tracking-widest text-primary uppercase mb-4">Related Missions</h2>
                <div className="space-y-3">
                  {missions.map(m => (
                    <Link key={m._id} to={`/missions/${m.slug}`}
                      className="flex items-center justify-between p-4 bg-card border border-border hover:border-primary/40 transition-colors group">
                      <span className="font-display tracking-wider text-foreground group-hover:text-primary transition-colors">{m.name || m.title}</span>
                      {m.status && <span className={`text-xs font-mono px-2 py-0.5 border rounded-full ${getStatusClass(m.status)}`}>{m.status}</span>}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <div className="bg-card border border-border p-6">
              <h3 className="font-display text-xl tracking-widest text-primary uppercase mb-5">Planet Stats</h3>
              <div className="space-y-4">
                {planet.habitabilityScore != null && (
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-muted-foreground text-sm">Habitability</span>
                      <span className="text-primary font-mono">{planet.habitabilityScore}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${planet.habitabilityScore}%` }} />
                    </div>
                  </div>
                )}
                {[
                  ['Distance', planet.distance],
                  ['Gravity', planet.gravity],
                  ['Atmosphere', planet.atmosphere],
                ].map(([label, val]) => val ? (
                  <div key={label} className="border-t border-border pt-3">
                    <div className="text-xs text-muted-foreground mb-1">{label}</div>
                    <div className="text-primary font-mono text-sm">{val}</div>
                  </div>
                ) : null)}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
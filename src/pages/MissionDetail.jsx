import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import Header from '../components/Header';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { getStatusClass } from '../lib/wixUtils';

export default function MissionDetail() {
  const { slug } = useParams();
  const [mission, setMission] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.functions.invoke('getWixCMSData', { collectionId: 'Missions', slug })
      .then(res => setMission(res.data.item || null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return (
    <div className="min-h-screen bg-background font-body">
      <Header />
      <div className="flex justify-center pt-40"><div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" /></div>
    </div>
  );

  if (!mission) return (
    <div className="min-h-screen bg-background font-body">
      <Header />
      <div className="text-center pt-40 text-muted-foreground">Mission not found. <Link to="/missions" className="text-primary hover:underline">Back to missions</Link></div>
    </div>
  );

  const name = mission.title;
  const destName = mission.planet;
  const crewArr = [];

  return (
    <div className="min-h-screen bg-background font-body">
      <Header />
      <div className="pt-28 px-[6vw] md:px-[8vw] pb-20">
        <Link to="/missions" className="inline-flex items-center gap-2 text-sm font-mono text-muted-foreground hover:text-primary transition-colors mb-10">
          <ArrowLeft className="w-4 h-4" /> All Missions
        </Link>

        <div className="grid md:grid-cols-[1fr_320px] gap-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <h1 className="font-display text-4xl md:text-6xl tracking-widest text-primary uppercase">{name}</h1>
              {mission.status && (
                <span className={`text-sm font-mono px-3 py-1 border rounded-full ${getStatusClass(mission.status)}`}>{mission.status}</span>
              )}
            </div>

            {destName && (
              <p className="text-primary font-mono text-sm mb-6">→ {destName}</p>
            )}

            {mission.description && (
              <div className="mb-10">
                <h2 className="font-display text-2xl tracking-widest text-primary uppercase mb-4">Mission Brief</h2>
                <p className="text-foreground/80 leading-relaxed">{mission.description}</p>
              </div>
            )}

            {crewArr.length > 0 && (
              <div>
                <h2 className="font-display text-2xl tracking-widest text-primary uppercase mb-5">Crew</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {crewArr.map((c, ci) => {
                    const cName = c.name || c.title;
                    const cSlug = c.slug || cName?.toLowerCase().replace(/\s+/g, '-');
                    const cImage = c.photo || c.image || c.mainImage;
                    return (
                      <Link key={ci} to={`/crew/${cSlug}`} className="flex items-center gap-3 p-3 bg-card border border-border hover:border-primary/40 transition-colors group">
                        {cImage ? (
                          <img src={cImage} alt={cName} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg flex-shrink-0">🐱</div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-body group-hover:text-primary transition-colors truncate">{cName}</p>
                          {c.role && <p className="text-xs text-muted-foreground truncate">{c.role}</p>}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <div className="bg-card border border-border p-6">
              <h3 className="font-display text-xl tracking-widest text-primary uppercase mb-4">Details</h3>
              <div className="space-y-3">
                {[
                  ['Status', mission.status],
                  ['Destination', destName],
                  ['Launch Date', mission.launchDate?.split('T')[0] || mission.launchDate],
                ].map(([label, val]) => val ? (
                  <div key={label} className="border-t border-border pt-3 first:border-0 first:pt-0">
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
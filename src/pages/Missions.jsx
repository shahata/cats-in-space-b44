import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import Header from '../components/Header';
import { motion } from 'framer-motion';
import { getStatusClass, formatDate } from '../lib/wixUtils';

export default function Missions() {
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.functions.invoke('getWixCMSData', { collectionId: 'Missions' })
      .then(res => setMissions(res.data.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-background font-body">
      <Header />
      <div className="pt-28 px-[6vw] md:px-[8vw] pb-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <p className="font-mono text-xs tracking-widest uppercase text-primary mb-2">★ Expeditions ★</p>
          <h1 className="font-display text-5xl md:text-7xl tracking-widest text-foreground uppercase mb-2">Mission Control</h1>
          <p className="text-muted-foreground font-body mb-14">Tracking every whisker-raising expedition into the unknown</p>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-32"><div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" /></div>
        ) : missions.length === 0 ? (
          <p className="text-center text-muted-foreground py-32">No missions found.</p>
        ) : (
          <div className="space-y-4 max-w-3xl">
            {missions.map((mission, i) => {
              const name = mission.title;
              const slug = mission.slug;
              const destName = mission.planet;
              return (
                <motion.div key={mission._id || i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                  <Link to={`/missions/${slug}`}
                    className="flex gap-5 items-start bg-card border border-border hover:border-primary/40 transition-all p-6 group">
                    <div className="w-16 h-16 bg-muted rounded flex-shrink-0 flex items-center justify-center text-2xl">🚀</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap mb-1">
                        <h2 className="font-display text-xl tracking-wider text-foreground group-hover:text-primary transition-colors uppercase">
                          {name}
                        </h2>
                        {mission.status && (
                          <span className={`text-xs font-mono px-2 py-0.5 border rounded-full ${getStatusClass(mission.status)}`}>{mission.status}</span>
                        )}
                      </div>
                      {destName && <p className="text-primary text-xs font-mono mb-2">→ {destName}</p>}
                      <div className="flex items-center justify-between">
                        <div />
                        {mission.launchDate && (
                          <span className="text-xs font-mono text-primary">{mission.launchDate?.split('T')[0] || mission.launchDate}</span>
                        )}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
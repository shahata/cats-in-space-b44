import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import Header from '../components/Header';
import { motion } from 'framer-motion';
import { getStatusClass } from '../lib/wixUtils';

export default function Missions() {
  const [missions, setMissions] = useState([]);
  const [crew, setCrew] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.functions.invoke('getWixCMSData', { collectionId: 'Missions', includeRefs: ['crew'] }),
      base44.functions.invoke('getWixCMSData', { collectionId: 'Planets' })
    ]).then(([missionsRes, planetsRes]) => {
      const missionsData = missionsRes.data.items || [];
      const allPlanets = planetsRes.data.items || [];
      
      const enrichedMissions = missionsData.map(m => {
        // crew is now included via includeRefs
        const crewMembers = m.crew || [];
        return {
          ...m,
          crewMembers,
          planetData: allPlanets.find(p => (p.name || p.title || '').toLowerCase() === (m.planet || '').toLowerCase())
        };
      });
      
      setMissions(enrichedMissions);
    }).catch(err => console.error('Missions error:', err))
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
          <div className="space-y-4">
            {missions.map((mission, i) => {
              const name = mission.title;
              const slug = mission.slug;
              const destName = mission.planet;
              const planetImage = mission.planetData?.mainImage || mission.planetData?.photo || mission.planetData?.image;
              const statusColors = {
                'in progress': 'border-l-primary',
                'launching soon': 'border-l-[#FFD700]',
                'planned': 'border-l-[#9370DB]',
                'planning': 'border-l-[#9370DB]',
                'completed': 'border-l-[#4ADE80]'
              };
              const borderColor = statusColors[mission.status?.toLowerCase()] || 'border-l-primary';
              
              return (
                <motion.div key={mission._id || i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                  <Link to={`/missions/${slug}`}
                    className={`flex gap-6 bg-card border border-border ${borderColor} border-l-4 hover:border-border-primary/40 transition-all p-6 group`}>
                    {/* Planet Image */}
                    <div className="w-20 h-20 bg-muted rounded-full flex-shrink-0 flex items-center justify-center text-3xl overflow-hidden">
                      {planetImage ? (
                        <img src={planetImage} alt={destName} className="w-full h-full object-cover" />
                      ) : (
                        <span>🪐</span>
                      )}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap mb-2">
                        <h2 className="font-display text-lg md:text-xl tracking-wider text-primary uppercase group-hover:text-primary/80 transition-colors">
                          {name}
                        </h2>
                        {mission.status && (
                          <span className={`text-xs font-mono px-2.5 py-1 border rounded-full ${getStatusClass(mission.status)}`}>
                            {mission.status.toUpperCase()}
                          </span>
                        )}
                      </div>
                      
                      {destName && (
                        <p className="text-primary/70 text-xs font-mono mb-2">→ {destName}</p>
                      )}
                      
                      {mission.description && (
                        <p className="text-foreground/70 text-sm mb-4 line-clamp-2">{mission.description}</p>
                      )}
                      
                      <div className="flex items-center justify-between flex-wrap gap-4 pt-2">
                        {mission.crewMembers?.length > 0 && (
                          <div className="flex flex-col gap-1">
                            <span className="text-xs text-muted-foreground font-mono uppercase">Crew</span>
                            <div className="flex gap-1 flex-wrap">
                              {mission.crewMembers.map((c, ci) => {
                                const cImage = c.image;
                                const cName = c.name || 'Crew';
                                return (
                                  <div key={ci} className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-sm overflow-hidden" title={cName}>
                                    {cImage ? (
                                      <img src={cImage} alt={cName} className="w-full h-full object-cover" />
                                    ) : (
                                      <span>🐱</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        
                        {mission.launchDate && (
                          <div className="flex flex-col gap-1">
                            <span className="text-xs text-muted-foreground font-mono uppercase">Launch</span>
                            <span className="text-sm font-mono text-primary">{mission.launchDate?.split('T')[0]}</span>
                          </div>
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
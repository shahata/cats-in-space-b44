import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import Header from '../components/Header';
import { motion } from 'framer-motion';
import { getStatusClass } from '../lib/wixUtils';

export default function Crew() {
  const [crew, setCrew] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.functions.invoke('getWixCMSData', { collectionId: 'CatExplorers' })
      .then(res => setCrew(res.data.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-background font-body">
      <Header />
      <div className="pt-28 px-[6vw] md:px-[8vw] pb-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <p className="font-mono text-xs tracking-widest uppercase text-primary mb-2">★ The Brave ★</p>
          <h1 className="font-display text-5xl md:text-7xl tracking-widest text-foreground uppercase mb-2">Crew Roster</h1>
          <p className="text-muted-foreground font-body mb-14">The bravest cats to ever leave a perfectly good cardboard box behind</p>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-32"><div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" /></div>
        ) : crew.length === 0 ? (
          <p className="text-center text-muted-foreground py-32">No crew members found.</p>
        ) : (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
            {crew.map((member, i) => {
              const image = member.image || member.photo || member.mainImage;
              const name = member.title || member.name;
              const slug = member.slug || name?.toLowerCase().replace(/\s+/g, '-');
              return (
                <motion.div key={member._id || i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
                  <Link to={`/crew/${slug}`} className="block bg-card border border-border hover:border-primary/40 transition-all p-6 text-center group">
                    {image ? (
                      <img src={image} alt={name} className="w-24 h-24 object-cover rounded-full mx-auto mb-4" />
                    ) : (
                      <div className="w-24 h-24 bg-muted rounded-full mx-auto mb-4 flex items-center justify-center text-4xl">🐱</div>
                    )}
                    <h2 className="font-display text-xl tracking-wider text-foreground group-hover:text-primary transition-colors uppercase mb-1">{name}</h2>
                    {member.role && <p className="text-primary text-sm font-body mb-2">{member.role}</p>}
                    {member.status && (
                      <span className={`text-xs font-mono px-2 py-0.5 border rounded-full ${getStatusClass(member.status)}`}>{member.status}</span>
                    )}
                    {member.bio && <p className="text-muted-foreground text-xs mt-3 line-clamp-3">{member.bio}</p>}
                    {member.specialSkill && <p className="text-primary/70 text-xs italic mt-2">{member.specialSkill}</p>}
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
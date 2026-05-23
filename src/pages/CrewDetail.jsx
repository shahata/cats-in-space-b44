import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import Header from '../components/Header';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { getStatusClass } from '../lib/wixUtils';

export default function CrewDetail() {
  const { slug } = useParams();
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.functions.invoke('getWixCMSData', { collectionId: 'CatExplorers', slug })
      .then(res => setMember(res.data.item || null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return (
    <div className="min-h-screen bg-background font-body">
      <Header />
      <div className="flex justify-center pt-40"><div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" /></div>
    </div>
  );

  if (!member) return (
    <div className="min-h-screen bg-background font-body">
      <Header />
      <div className="text-center pt-40 text-muted-foreground">Crew member not found. <Link to="/crew" className="text-primary hover:underline">Back to crew</Link></div>
    </div>
  );

  const image = member.image || member.photo || member.mainImage;
  const name = member.title || member.name;

  return (
    <div className="min-h-screen bg-background font-body">
      <Header />
      <div className="pt-28 px-[6vw] md:px-[8vw] pb-20">
        <Link to="/crew" className="inline-flex items-center gap-2 text-sm font-mono text-muted-foreground hover:text-primary transition-colors mb-10">
          <ArrowLeft className="w-4 h-4" /> All Crew
        </Link>

        <div className="grid md:grid-cols-[1fr_320px] gap-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-start gap-6 mb-8">
              {image ? (
                <img src={image} alt={name} className="w-28 h-28 object-cover rounded-full border-2 border-primary/30 flex-shrink-0" />
              ) : (
                <div className="w-28 h-28 bg-muted rounded-full flex items-center justify-center text-5xl flex-shrink-0">🐱</div>
              )}
              <div>
                <h1 className="font-display text-4xl md:text-6xl tracking-widest text-primary uppercase mb-1">{name}</h1>
                {member.role && <p className="text-primary text-base font-body mb-2">{member.role}</p>}
                {member.status && (
                  <span className={`text-xs font-mono px-3 py-1 border rounded-full ${getStatusClass(member.status)}`}>{member.status}</span>
                )}
              </div>
            </div>

            {member.bio && (
              <div>
                <h2 className="font-display text-2xl tracking-widest text-primary uppercase mb-4">Bio</h2>
                <p className="text-foreground/80 leading-relaxed">{member.bio}</p>
              </div>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="space-y-4">
            <div className="bg-card border border-border p-6">
              <h3 className="font-display text-xl tracking-widest text-primary uppercase mb-5">Dossier</h3>
              <div className="space-y-4">
                {[
                  ['Special Skill', member.specialSkill],
                  ['Status', member.status],
                  ['Role', member.role],
                ].map(([label, val]) => val ? (
                  <div key={label} className="border-t border-border pt-3 first:border-0 first:pt-0">
                    <div className="text-xs text-muted-foreground mb-1">{label}</div>
                    <div className="text-primary font-body">{val}</div>
                  </div>
                ) : null)}
              </div>
            </div>

            {member.funFact && (
              <div className="bg-card border border-border p-6">
                <h3 className="font-display text-xl tracking-widest text-primary uppercase mb-3">Fun Fact</h3>
                <p className="text-foreground/70 text-sm leading-relaxed">{member.funFact}</p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
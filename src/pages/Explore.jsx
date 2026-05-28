import { Link } from 'react-router-dom';
import Header from '../components/Header';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export default function Explore() {
  const { data: facilities = [], isLoading } = useQuery({
    queryKey: ['cms', 'Facilities'],
    queryFn: async () => {
      const res = await base44.functions.invoke('getWixCMSData', {
        collectionId: 'Facilities',
        sort: [{ fieldName: 'order', order: 'ASC' }],
      });
      return res.data?.items || [];
    },
  });
  return (
    <div className="min-h-screen bg-background font-body">
      <Header />
      <div className="pt-28 px-[6vw] md:px-[8vw] pb-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
          <p className="font-mono text-xs tracking-widest uppercase text-primary mb-2">★ The Vessel ★</p>
          <h1 className="font-display text-5xl md:text-7xl tracking-widest text-foreground uppercase mb-4">Aboard the SS Scratching Post</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">Everything the ship offers — and what your rank unlocks</p>
        </motion.div>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          className="text-center text-foreground/60 max-w-2xl mx-auto mb-16 text-sm leading-relaxed">
          The SS Scratching Post isn't just a vessel — it's a fully-stocked outpost for the discerning interstellar feline.
          Stroll the decks, fuel your mission, and get your whiskers trimmed between jumps.
        </motion.p>

        <div className="mb-20">
          <h2 className="font-display text-3xl tracking-widest text-primary uppercase mb-2">Facilities on Board</h2>
          <p className="text-muted-foreground mb-10 text-sm">Everyone's welcome in the public areas</p>

          {isLoading ? (
            <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" /></div>
          ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {facilities.map((f, i) => (
              <motion.div key={f._id || i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.1 }}>
                <div className="bg-card border border-border overflow-hidden h-full flex flex-col">
                  <img src={f.image} alt={f.name} className="w-full h-48 object-cover" />
                  <div className="p-6 flex flex-col flex-1">
                    <span className="text-xs font-mono text-primary/60 tracking-widest mb-2">{f.deck}</span>
                    <h3 className="font-display text-2xl tracking-wider text-primary uppercase mb-2">{f.name}</h3>
                    <p className="text-muted-foreground text-sm flex-1 mb-4">{f.description}</p>
                    <Link to={f.link} className="text-primary text-sm font-mono hover:underline">{f.linkText}</Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          )}
        </div>

        {/* Navigation sections */}
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { image: 'https://media.base44.com/images/public/6a115eeb3c3d127dbcd0a2fe/2759063ca_research.png', title: 'Planet Database', desc: 'All surveyed worlds ranked by habitability for feline life.', link: '/planets', linkText: 'Explore Planets →' },
            { image: 'https://media.base44.com/images/public/6a115eeb3c3d127dbcd0a2fe/997288998_plans.png', title: 'Crew Roster', desc: 'The bravest cats to ever leave a perfectly good cardboard box behind.', link: '/crew', linkText: 'Meet the Crew →' },
            { image: 'https://media.base44.com/images/public/6a115eeb3c3d127dbcd0a2fe/b2e26739c_log.png', title: 'Mission Control', desc: 'Tracking every whisker-raising expedition into the unknown.', link: '/missions', linkText: 'All Missions →' },
          ].map((item, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + i * 0.1 }}>
              <Link to={item.link} className="block bg-card border border-border overflow-hidden hover:border-primary/40 p-0 group transition-colors h-full flex flex-col">
                <img src={item.image} alt={item.title} className="w-full h-40 object-cover" />
                <div className="p-6 flex flex-col flex-1">
                  <h3 className="font-display text-xl tracking-wider text-foreground group-hover:text-primary uppercase mb-2 transition-colors">{item.title}</h3>
                  <p className="text-muted-foreground text-xs mb-4">{item.desc}</p>
                  <span className="text-primary text-sm font-mono mt-auto">{item.linkText}</span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Membership CTA */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}
          className="mt-16 text-center border border-border bg-card p-12 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <img src="https://media.base44.com/images/public/6a115eeb3c3d127dbcd0a2fe/b2e26739c_log.png" alt="" className="w-full h-full object-cover" />
          </div>
          <div className="relative z-10">
            <h2 className="font-display text-3xl tracking-widest text-primary uppercase mb-4">Join the Crew</h2>
            <p className="text-muted-foreground max-w-lg mx-auto mb-8 text-sm">
              A crew membership unlocks premium Ship's Log dispatches, complimentary medical appointments,
              discounted tickets at The Nebula Theater, and first dibs on supply-depot restocks.
            </p>
            <Link to="/plans" className="inline-block bg-primary text-primary-foreground px-8 py-3 font-display text-lg tracking-widest uppercase hover:bg-primary/80 transition-colors">
              Choose Your Rank →
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
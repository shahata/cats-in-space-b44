import { Link } from 'react-router-dom';
import { STATIC_CREW } from '../lib/staticData';
import Header from '../components/Header';
import { motion } from 'framer-motion';
import { getStatusClass } from '../lib/wixUtils';

export default function Crew() {
  return (
    <div className="min-h-screen bg-background font-body">
      <Header />
      <div className="pt-28 px-[6vw] md:px-[8vw] pb-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <p className="font-mono text-xs tracking-widest uppercase text-primary mb-2">★ The Brave ★</p>
          <h1 className="font-display text-5xl md:text-7xl tracking-widest text-foreground uppercase mb-2">Crew Roster</h1>
          <p className="text-muted-foreground font-body mb-14">The bravest cats to ever leave a perfectly good cardboard box behind</p>
        </motion.div>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
          {STATIC_CREW.map((member, i) => (
            <motion.div key={member.slug} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
              <Link to={`/crew/${member.slug}`} className="block bg-card border border-border hover:border-primary/40 transition-all p-6 text-center group">
                <img src={member.image} alt={member.title} className="w-24 h-24 object-cover rounded-full mx-auto mb-4" />
                <h2 className="font-display text-xl tracking-wider text-foreground group-hover:text-primary transition-colors uppercase mb-1">{member.title}</h2>
                <p className="text-primary text-sm font-body mb-2">{member.role}</p>
                <span className={`text-xs font-mono px-2 py-0.5 border rounded-full ${getStatusClass(member.status)}`}>{member.status}</span>
                <p className="text-muted-foreground text-xs mt-3 line-clamp-3">{member.bio}</p>
                <p className="text-primary/70 text-xs italic mt-2">{member.specialSkill}</p>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import Header from '../components/Header';
import ProductCard from '../components/ProductCard';
import useWixCart from '../lib/useWixCart';
import { motion } from 'framer-motion';
import { ArrowDown } from 'lucide-react';
import { getStatusClass } from '../lib/wixUtils';

const HERO_IMG = 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=1800&q=80';

export default function Home() {
  const [products, setProducts] = useState([]);
  const [planets, setPlanets] = useState([]);
  const [crew, setCrew] = useState([]);
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addItem } = useWixCart();

  useEffect(() => {
    Promise.all([
      base44.functions.invoke('getWixProducts', {}).then(r => r.data.products || []).catch(() => []),
      base44.functions.invoke('getWixCMSData', { collectionId: 'Planets', limit: 3, sort: [{ fieldName: 'habitabilityScore', order: 'DESC' }] }).then(r => r.data.items || []).catch(() => []),
      base44.functions.invoke('getWixCMSData', { collectionId: 'CatExplorers', limit: 6 }).then(r => r.data.items || []).catch(() => []),
      base44.functions.invoke('getWixCMSData', { collectionId: 'Missions', limit: 4 }).then(r => r.data.items || []).catch(() => []),
    ]).then(([prods, pls, cr, mis]) => {
      setProducts(prods);
      setPlanets(pls);
      setCrew(cr);
      setMissions(mis);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-background font-body">
      <Header />

      {/* Hero */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img src={HERO_IMG} alt="Space" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/60" />
        </div>
        <div className="relative z-10 px-[6vw] text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }}>
            <p className="font-mono text-xs tracking-widest uppercase mb-6 text-primary">BREAKING: Earth's litter box declared full...</p>
            <h1 className="font-display text-7xl md:text-[120px] lg:text-[160px] tracking-widest leading-none mb-6 text-primary uppercase">
              Cats in Space
            </h1>
            <p className="font-display text-xl md:text-3xl text-foreground/90 italic mb-4 tracking-wide">
              Earth's litter box is full. Time to find a new planet.
            </p>
            <p className="font-body text-foreground/60 text-base md:text-lg max-w-md mx-auto mb-10">
              A brave crew of cats has launched into the cosmos...
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link to="/explore" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 font-display text-base tracking-widest uppercase hover:bg-primary/80 transition-colors">
                Explore the Ship
              </Link>
              <Link to="/planets" className="inline-flex items-center gap-2 border border-primary text-primary px-6 py-3 font-display text-base tracking-widest uppercase hover:bg-primary/10 transition-colors">
                Explore Planets
              </Link>
              <Link to="/crew" className="inline-flex items-center gap-2 border border-foreground/30 text-foreground/80 px-6 py-3 font-display text-base tracking-widest uppercase hover:border-primary hover:text-primary transition-colors">
                Meet the Crew
              </Link>
            </div>
            <button onClick={() => document.getElementById('stats')?.scrollIntoView({ behavior: 'smooth' })}
              className="mt-10 inline-flex flex-col items-center gap-1 text-foreground/40 hover:text-primary transition-colors">
              <ArrowDown className="w-5 h-5 animate-bounce" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* Stats strip */}
      <section id="stats" className="border-y border-border/30 px-[6vw] md:px-[8vw] py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: planets.length > 0 ? `${planets.length}+` : '3+', label: 'Planets Scanned' },
            { value: crew.length > 0 ? crew.length : 6, label: 'Brave Explorers' },
            { value: missions.length > 0 ? missions.length : 4, label: 'Active Missions' },
            { value: 0, label: 'Vacuum Cleaners' },
          ].map((stat, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
              <div className="font-display text-4xl md:text-5xl text-primary mb-1">{stat.value}</div>
              <div className="font-mono text-xs text-muted-foreground uppercase tracking-widest">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Top Planet Candidates */}
      <section className="px-[6vw] md:px-[8vw] py-20">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="mb-10">
          <p className="font-mono text-xs tracking-widest uppercase text-primary mb-2">★ Scouted Worlds ★</p>
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-4xl md:text-6xl tracking-widest text-foreground uppercase">Top Planet Candidates</h2>
            <Link to="/planets" className="text-primary font-mono text-sm hover:underline hidden md:block">All Planets →</Link>
          </div>
          <p className="text-muted-foreground mt-1">Our best picks for a new feline homeworld</p>
        </motion.div>
        {planets.length === 0 ? (
          <div className="text-center py-10"><div className="w-5 h-5 border-2 border-border border-t-primary rounded-full animate-spin mx-auto" /></div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6 mb-6">
            {planets.map((planet, i) => {
              const image = planet.mainImage || planet.photo || planet.image;
              return (
                <motion.div key={planet._id || i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                  <Link to={`/planets/${planet.slug}`} className="block bg-card border border-border hover:border-primary/40 transition-all group overflow-hidden">
                    {image ? <img src={image} alt={planet.name || planet.title} className="w-full h-48 object-cover" /> : <div className="w-full h-48 bg-muted flex items-center justify-center text-6xl">🪐</div>}
                    <div className="p-5">
                      {planet.status && <span className={`text-xs font-mono px-2 py-0.5 border rounded-full mb-2 inline-block ${getStatusClass(planet.status)}`}>{planet.status}</span>}
                      <h3 className="font-display text-xl tracking-wider text-foreground group-hover:text-primary transition-colors uppercase mb-1">{planet.name || planet.title}</h3>
                      {planet.tagline && <p className="text-muted-foreground text-xs mb-3">{planet.tagline}</p>}
                      {planet.habitabilityScore != null && (
                        <div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary" style={{ width: `${planet.habitabilityScore}%` }} /></div>
                          <p className="text-xs font-mono text-primary mt-1">{planet.habitabilityScore}% Habitable</p>
                        </div>
                      )}
                      {planet.distance && <p className="text-xs text-muted-foreground mt-1">{planet.distance} Distance</p>}
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      {/* The Crew */}
      <section className="px-[6vw] md:px-[8vw] py-20 border-t border-border/30">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="mb-10">
          <p className="font-mono text-xs tracking-widest uppercase text-primary mb-2">★ The Brave ★</p>
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-4xl md:text-6xl tracking-widest text-foreground uppercase">The Crew</h2>
            <Link to="/crew" className="text-primary font-mono text-sm hover:underline hidden md:block">Full Crew Roster →</Link>
          </div>
          <p className="text-muted-foreground mt-1">The bravest (and furriest) explorers in the galaxy</p>
        </motion.div>
        {crew.length === 0 ? (
          <div className="text-center py-10"><div className="w-5 h-5 border-2 border-border border-t-primary rounded-full animate-spin mx-auto" /></div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {crew.map((member, i) => {
              const image = member.image || member.photo || member.mainImage;
              const name = member.title || member.name;
              const slug = member.slug || name?.toLowerCase().replace(/\s+/g, '-');
              return (
                <motion.div key={member._id || i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }}>
                  <Link to={`/crew/${slug}`} className="block text-center group">
                    {image ? <img src={image} alt={name} className="w-20 h-20 rounded-full object-cover mx-auto mb-3 border-2 border-border group-hover:border-primary transition-colors" /> : <div className="w-20 h-20 rounded-full bg-muted mx-auto mb-3 flex items-center justify-center text-3xl border-2 border-border group-hover:border-primary transition-colors">🐱</div>}
                    {member.status && <span className={`text-xs font-mono px-2 py-0.5 border rounded-full ${getStatusClass(member.status)} inline-block mb-1`}>{member.status}</span>}
                    <p className="font-display text-sm tracking-wider text-foreground group-hover:text-primary transition-colors uppercase">{name}</p>
                    {member.role && <p className="text-muted-foreground text-xs">{member.role}</p>}
                    {member.specialSkill && <p className="text-primary/60 text-xs italic">{member.specialSkill}</p>}
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      {/* Mission Log */}
      <section className="px-[6vw] md:px-[8vw] py-20 border-t border-border/30">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="mb-10">
          <p className="font-mono text-xs tracking-widest uppercase text-primary mb-2">★ Expeditions ★</p>
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-4xl md:text-6xl tracking-widest text-foreground uppercase">Mission Log</h2>
            <Link to="/missions" className="text-primary font-mono text-sm hover:underline hidden md:block">All Missions →</Link>
          </div>
          <p className="text-muted-foreground mt-1">Current expeditions and upcoming launches</p>
        </motion.div>
        {missions.length === 0 ? (
          <div className="text-center py-10"><div className="w-5 h-5 border-2 border-border border-t-primary rounded-full animate-spin mx-auto" /></div>
        ) : (
          <div className="space-y-3 max-w-2xl">
            {missions.map((mission, i) => {
              const name = mission.name || mission.title;
              const slug = mission.slug || name?.toLowerCase().replace(/\s+/g, '-');
              const destName = mission.planet;
              return (
                <motion.div key={mission._id || i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
                  <Link to={`/missions/${slug}`} className="block p-5 border border-border hover:border-primary/40 transition-colors group">
                    <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
                      <span className="text-xs font-mono text-muted-foreground">{mission.launchDate?.split('T')[0] || ''}</span>
                      {mission.status && <span className={`text-xs font-mono px-2 py-0.5 border rounded-full ${getStatusClass(mission.status)}`}>{mission.status}</span>}
                    </div>
                    <h3 className="font-display text-xl tracking-wider text-foreground group-hover:text-primary transition-colors uppercase mb-1">{name}</h3>
                    {mission.description && <p className="text-muted-foreground text-xs line-clamp-2 mb-2">{mission.description}</p>}
                    {destName && <p className="text-xs font-mono text-primary/70">Destination: {destName}</p>}
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      {/* Shop Collection */}
      <section id="collection" className="px-[6vw] md:px-[8vw] py-20 border-t border-border/30">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="flex items-baseline justify-between mb-14">
          <div>
            <p className="font-mono text-xs tracking-widest uppercase text-primary mb-2">★ Space Gear ★</p>
            <h2 className="font-display text-4xl md:text-6xl tracking-widest text-foreground uppercase">Mission Supplies</h2>
          </div>
          {products.length > 0 && <span className="font-mono text-sm text-muted-foreground">{products.length} items</span>}
        </motion.div>
        {loading ? (
          <div className="flex items-center justify-center py-32"><div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" /></div>
        ) : products.length === 0 ? (
          <p className="text-muted-foreground text-center py-32 font-body">No products available yet.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-5 gap-y-14">
            {products.map((p, i) => <ProductCard key={p.id} product={p} onAdd={addItem} index={i} />)}
          </div>
        )}
      </section>

      {/* Quote */}
      <section className="text-center py-16 border-t border-border/30 px-[6vw]">
        <p className="font-display text-2xl md:text-3xl text-foreground/40 italic tracking-wider mb-2">
          "One small step for cat, one giant leap for catkind."
        </p>
        <p className="font-mono text-xs text-muted-foreground">— Captain Whiskers, before the first launch</p>
      </section>

      <footer className="border-t border-border/30 px-[6vw] md:px-[8vw] py-10 flex flex-col md:flex-row items-center justify-between gap-4">
        <span className="font-display text-2xl tracking-widest text-primary uppercase">Cats in Space</span>
        <p className="text-muted-foreground text-xs font-mono">© 2026 — No cats were harmed. Several were mildly inconvenienced by space suits.</p>
      </footer>
    </div>
  );
}
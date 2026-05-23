import { Link } from 'react-router-dom';
import Header from '../components/Header';
import { motion } from 'framer-motion';

const facilities = [
  {
    deck: 'DECK 2',
    image: 'https://images.unsplash.com/photo-1559583109-3e7968c5f03d?w=600&q=80',
    name: 'Supply Depot',
    description: 'Gear up for the mission — tactical hairballs, zero-gravity cat trees, and nebula-nip from our shop.',
    link: '/',
    linkText: 'Browse the shelves →',
  },
  {
    deck: 'DECK 3',
    image: 'https://images.unsplash.com/photo-1516574187841-69301976e493?w=600&q=80',
    name: 'Medical Bay',
    description: 'Routine checkups, vaccinations against alien parasites, and that annoying hairball cough.',
    link: '/crew',
    linkText: 'Meet the medical crew →',
  },
  {
    deck: 'DECK 5',
    image: 'https://images.unsplash.com/photo-1556910103-1c02745a30bf?w=600&q=80',
    name: 'The Cosmic Kitchen',
    description: 'Intergalactic cuisine, pickup and delivery across the ship. The Nebula Nachos are legendary.',
    link: '/blog',
    linkText: 'Read the menu →',
  },
  {
    deck: 'DECK 7',
    image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&q=80',
    name: 'The Nebula Theater',
    description: 'Weekly screenings of cat-themed classics — Star Paws, The Meowtrix, Cat-ablanca — every weeknight at 20:00 sharp.',
    link: '/blog',
    linkText: "See what's playing →",
  },
];

export default function Explore() {
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

          <div className="grid md:grid-cols-2 gap-6">
            {facilities.map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.1 }}>
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
        </div>

        {/* Navigation sections */}
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&q=80', title: 'Planet Database', desc: 'All surveyed worlds ranked by habitability for feline life.', link: '/planets', linkText: 'Explore Planets →' },
            { image: 'https://images.unsplash.com/photo-1541873676-a18131494164?w=600&q=80', title: 'Crew Roster', desc: 'The bravest cats to ever leave a perfectly good cardboard box behind.', link: '/crew', linkText: 'Meet the Crew →' },
            { image: 'https://images.unsplash.com/photo-1517976487492-5750f31959d3?w=600&q=80', title: 'Mission Control', desc: 'Tracking every whisker-raising expedition into the unknown.', link: '/missions', linkText: 'All Missions →' },
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
            <img src="https://static.wixstatic.com/media/a2b5c3_d8f9e2a1b3c4d5e6f7g8h9i0j1k2l3m4.jpg/v1/fill/w_1200,h_800,al_c,q_85/a2b5c3_d8f9e2a1b3c4d5e6f7g8h9i0j1k2l3m4.jpg" alt="" className="w-full h-full object-cover" />
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
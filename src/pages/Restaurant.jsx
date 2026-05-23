import { Link } from 'react-router-dom';
import Header from '../components/Header';
import { motion } from 'framer-motion';
import { ArrowLeft, Armchair, Car } from 'lucide-react';

export default function Restaurant() {
  return (
    <div className="min-h-screen bg-background font-body">
      <Header />
      <div className="pt-28 px-[6vw] md:px-[8vw] pb-20">
        <Link to="/explore" className="inline-flex items-center gap-2 text-sm font-mono text-muted-foreground hover:text-primary transition-colors mb-10">
          <ArrowLeft className="w-4 h-4" /> Back to Explore
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <p className="font-mono text-xs tracking-widest uppercase text-primary mb-2">★ Deck 5 ★</p>
          <h1 className="font-display text-5xl md:text-7xl tracking-widest text-primary uppercase mb-3">The Cosmic Kitchen</h1>
          <p className="text-muted-foreground font-body max-w-xl mx-auto">
            Intergalactic cuisine, pickup and delivery across the ship. Reserve a table for the tasting menu or order to your quarters.
          </p>
        </motion.div>

        {/* Two big CTAs like the reference site */}
        <div className="flex flex-wrap justify-center gap-4 mb-16">
          <Link
            to="/restaurant/reserve"
            className="inline-flex items-center gap-3 bg-card border border-primary text-primary px-8 py-4 font-mono text-sm tracking-widest uppercase hover:bg-primary/10 transition-all rounded-full"
          >
            <Armchair className="w-5 h-5" />
            Reserve a Table
          </Link>
          <Link
            to="/restaurant/order"
            className="inline-flex items-center gap-3 bg-primary text-primary-foreground px-8 py-4 font-mono text-sm tracking-widest uppercase hover:bg-primary/90 transition-all rounded-full"
          >
            <Car className="w-5 h-5" />
            Order Online
          </Link>
        </div>

        {/* Decorative menu peek */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center border-t border-border pt-12"
        >
          <h2 className="font-display text-3xl md:text-5xl tracking-widest text-foreground uppercase mb-3">Cats in Space Menu</h2>
          <p className="text-muted-foreground italic max-w-xl mx-auto">
            A galactic dining experience featuring space-themed dishes from across the universe.
          </p>
          <div className="mt-6 inline-block w-24 h-px bg-primary" />
        </motion.div>
      </div>
    </div>
  );
}
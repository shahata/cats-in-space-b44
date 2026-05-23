import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import Header from '../components/Header';
import { motion } from 'framer-motion';
import { ArrowLeft, Play, Calendar, MapPin } from 'lucide-react';

const formatNextShowtime = (iso) => {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch { return null; }
};

export default function Cinema() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.functions.invoke('getWixEvents', {})
      .then(res => setEvents(res.data.events || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Group events by movie (slug) — Wix may return each showtime as separate event
  const movies = useMemo(() => {
    const grouped = new Map();
    events.forEach(e => {
      const key = e.slug || e.name;
      if (!grouped.has(key)) {
        grouped.set(key, { ...e, showtimes: [], count: 0 });
      }
      const movie = grouped.get(key);
      movie.showtimes.push(e.startDateISO);
      movie.count++;
      // Keep earliest upcoming date
      if (!movie.nextShowtimeISO || (e.startDateISO && e.startDateISO < movie.nextShowtimeISO)) {
        movie.nextShowtimeISO = e.startDateISO;
      }
    });
    return Array.from(grouped.values()).sort((a, b) =>
      (a.nextShowtimeISO || '').localeCompare(b.nextShowtimeISO || '')
    );
  }, [events]);

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
          className="text-center mb-16"
        >
          <p className="font-mono text-xs tracking-widest uppercase text-primary mb-2">★ Deck 7 ★</p>
          <h1 className="font-display text-5xl md:text-7xl tracking-widest text-primary uppercase mb-3">The Nebula Theater</h1>
          <p className="text-muted-foreground font-body">Experience movies among the stars</p>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-32">
            <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" />
          </div>
        ) : movies.length === 0 ? (
          <p className="text-center text-muted-foreground py-32">No screenings scheduled.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {movies.map((movie, i) => (
              <motion.div
                key={movie.slug || movie.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <Link
                  to={`/cinema/${movie.slug || movie.id}`}
                  className="block group bg-card border border-border hover:border-primary/40 transition-all overflow-hidden"
                >
                  <div className="relative aspect-[2/3] overflow-hidden bg-muted">
                    {movie.image ? (
                      <img
                        src={movie.image}
                        alt={movie.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-6xl text-muted-foreground/30">🎬</div>
                    )}
                    {/* Showtimes badge */}
                    {movie.count > 0 && (
                      <div className="absolute top-3 right-3 bg-background/90 backdrop-blur-sm border border-primary/40 text-primary px-3 py-1 text-[10px] font-mono tracking-widest uppercase rounded-full">
                        {movie.count} Showtime{movie.count !== 1 ? 's' : ''}
                      </div>
                    )}
                    {/* Play overlay */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                      <div className="w-14 h-14 rounded-full border-2 border-primary bg-primary/20 backdrop-blur-sm flex items-center justify-center">
                        <Play className="w-5 h-5 text-primary fill-primary ml-1" />
                      </div>
                    </div>
                  </div>

                  <div className="p-5">
                    <h3 className="font-display text-xl tracking-wider text-foreground group-hover:text-primary transition-colors uppercase mb-2">
                      {movie.name}
                    </h3>

                    {movie.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {movie.tags.slice(0, 3).map(tag => (
                          <span
                            key={tag}
                            className="text-[10px] font-mono uppercase px-2 py-0.5 bg-primary/10 text-primary rounded-sm"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {movie.nextShowtimeISO && (
                      <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-primary" />
                        <span className="font-mono">Next:</span> {formatNextShowtime(movie.nextShowtimeISO)}
                      </div>
                    )}

                    {movie.description && (
                      <p className="text-muted-foreground text-xs line-clamp-2 leading-relaxed">{movie.description}</p>
                    )}
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
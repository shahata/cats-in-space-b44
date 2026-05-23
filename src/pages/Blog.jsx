import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import Header from '../components/Header';
import { motion } from 'framer-motion';
import { formatDate } from '../lib/wixUtils';

export default function Blog() {
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCat, setSelectedCat] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.functions.invoke('getWixBlog', { action: 'getCategories' })
      .then(res => setCategories(res.data.categories || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    base44.functions.invoke('getWixBlog', { categoryId: selectedCat || undefined })
      .then(res => setPosts(res.data.posts || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedCat]);

  const [featured, ...rest] = posts;

  return (
    <div className="min-h-screen bg-background font-body">
      <Header />
      <div className="pt-28 px-[6vw] md:px-[8vw] pb-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <p className="font-mono text-xs tracking-widest uppercase text-primary mb-2">★ Dispatches ★</p>
          <h1 className="font-display text-5xl md:text-7xl tracking-widest text-foreground uppercase mb-2">Ship's Log</h1>
          <p className="text-muted-foreground mb-10">Dispatches, reports, and tall tales from the feline frontier</p>
        </motion.div>

        {/* Category filter */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-10">
            <button onClick={() => setSelectedCat(null)}
              className={`text-xs font-mono px-4 py-2 border transition-colors ${!selectedCat ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/50'}`}>
              All
            </button>
            {categories.map(cat => (
              <button key={cat.id} onClick={() => setSelectedCat(selectedCat === cat.id ? null : cat.id)}
                className={`text-xs font-mono px-4 py-2 border transition-colors ${selectedCat === cat.id ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/50'}`}>
                {cat.label}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-32"><div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" /></div>
        ) : posts.length === 0 ? (
          <p className="text-center text-muted-foreground py-32">No posts found.</p>
        ) : (
          <>
            {/* Featured post */}
            {featured && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
                <Link to={`/blog/${featured.slug}`} className="grid md:grid-cols-[1fr_1fr] gap-0 bg-card border border-border hover:border-primary/40 transition-all group">
                  {featured.coverImage && (
                    <img src={featured.coverImage} alt={featured.title} className="w-full h-64 md:h-80 object-cover" />
                  )}
                  <div className="p-8 flex flex-col justify-center">
                    <div className="flex gap-2 flex-wrap mb-3">
                      {featured.categoryLabels?.map(l => l && (
                        <span key={l} className="text-xs font-mono px-2 py-0.5 bg-primary/10 text-primary border border-primary/30 rounded-full">{l}</span>
                      ))}
                    </div>
                    <h2 className="font-display text-2xl md:text-3xl tracking-wider text-foreground group-hover:text-primary transition-colors uppercase mb-3">{featured.title}</h2>
                    {featured.excerpt && <p className="text-muted-foreground text-sm line-clamp-3 mb-4">{featured.excerpt}</p>}
                    <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground">
                      <span>{featured.author}</span>
                      <span>·</span>
                      <span>{featured.publishedDate?.split('T')[0]}</span>
                      <span>·</span>
                      <span>{featured.minutesToRead} min read</span>
                    </div>
                    <div className="flex gap-4 text-xs font-mono text-muted-foreground mt-3">
                      <span>{featured.viewCount} views</span>
                      <span>{featured.likeCount} likes</span>
                      <span>{featured.commentCount} comments</span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            )}

            {/* Rest of posts */}
            <div className="grid md:grid-cols-2 gap-6">
              {rest.map((post, i) => (
                <motion.div key={post.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                  <Link to={`/blog/${post.slug}`} className="block bg-card border border-border hover:border-primary/40 transition-all group overflow-hidden">
                    {post.coverImage && (
                      <img src={post.coverImage} alt={post.title} className="w-full h-44 object-cover" />
                    )}
                    <div className="p-5">
                      <div className="flex gap-2 flex-wrap mb-2">
                        {post.categoryLabels?.map(l => l && (
                          <span key={l} className="text-xs font-mono px-1.5 py-0.5 bg-primary/10 text-primary border border-primary/30 rounded-full">{l}</span>
                        ))}
                      </div>
                      <h3 className="font-display text-xl tracking-wider text-foreground group-hover:text-primary transition-colors uppercase mb-2">{post.title}</h3>
                      {post.excerpt && <p className="text-muted-foreground text-xs line-clamp-2 mb-3">{post.excerpt}</p>}
                      <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                        <span>{post.author} · {post.minutesToRead} min</span>
                        <span className="text-primary hover:underline">Read →</span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
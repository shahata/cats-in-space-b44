import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import Header from '../components/Header';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

export default function BlogPost() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.functions.invoke('getWixBlog', { action: 'getPost', slug })
      .then(res => setPost(res.data.post || null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return (
    <div className="min-h-screen bg-background font-body">
      <Header />
      <div className="flex justify-center pt-40"><div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" /></div>
    </div>
  );

  if (!post) return (
    <div className="min-h-screen bg-background font-body">
      <Header />
      <div className="text-center pt-40 text-muted-foreground">Post not found. <Link to="/blog" className="text-primary hover:underline">Back to Ship's Log</Link></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background font-body">
      <Header />
      <div className="pt-28 px-[6vw] md:px-[8vw] pb-20 max-w-3xl">
        <Link to="/blog" className="inline-flex items-center gap-2 text-sm font-mono text-muted-foreground hover:text-primary transition-colors mb-10">
          <ArrowLeft className="w-4 h-4" /> Ship's Log
        </Link>

        <motion.article initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Category labels */}
          {post.categoryLabels?.length > 0 && (
            <div className="flex gap-2 flex-wrap mb-4">
              {post.categoryLabels.map(l => l && (
                <span key={l} className="text-xs font-mono px-2 py-0.5 bg-primary/10 text-primary border border-primary/30 rounded-full">{l}</span>
              ))}
            </div>
          )}

          <h1 className="font-display text-4xl md:text-6xl tracking-widest text-primary uppercase mb-4">{post.title}</h1>

          <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground mb-8">
            <span>{post.author}</span>
            <span>·</span>
            <span>{post.publishedDate?.split('T')[0]}</span>
            <span>·</span>
            <span>{post.minutesToRead} min read</span>
          </div>

          {post.coverImage && (
            <img src={post.coverImage} alt={post.title} className="w-full h-64 md:h-80 object-cover rounded mb-8 border border-border" />
          )}

          {post.excerpt && !post.content && (
            <div className="prose prose-invert max-w-none">
              <p className="text-foreground/80 leading-relaxed text-base">{post.excerpt}</p>
            </div>
          )}

          {post.content && (
            <div
              className="prose prose-invert prose-headings:font-display prose-headings:tracking-wider prose-headings:text-primary prose-a:text-primary max-w-none text-foreground/80 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />
          )}

          <div className="flex gap-6 mt-10 pt-6 border-t border-border text-sm font-mono text-muted-foreground">
            <span>{post.viewCount} views</span>
            <span>{post.likeCount} likes</span>
            <span>{post.commentCount} comments</span>
          </div>
        </motion.article>
      </div>
    </div>
  );
}
import { createClient, OAuthStrategy, media } from 'npm:@wix/sdk@1.21.12';
import { posts, categories } from 'npm:@wix/blog@latest';

function toImageUrl(val) {
  if (!val) return null;
  const id = typeof val === 'string' ? val : (val?.url || val?.src?.url || val?.id);
  if (!id) return null;
  if (typeof id === 'string' && id.startsWith('http')) return id;
  try {
    return media.getImageUrl(id).url;
  } catch {
    return null;
  }
}

function processPost(post) {
  if (!post) return null;
  const imageUrl = toImageUrl(
    post.featuredImage || post.media?.wixMedia?.image || post.image
  );

  const cats = (post.categories || []).map(c => c.name || c).filter(Boolean);

  return {
    id: post._id || post.id,
    title: post.title || 'Untitled Post',
    slug: post.slug,
    excerpt: post.excerpt || post.summary || '',
    content: post.body || post.content || '',
    author: post.author?.name || post.authorName || 'Unknown',
    publishedDate: post.firstPublishedDate || post.datePublished || post._createdDate,
    updatedDate: post.lastPublishedDate || post._updatedDate,
    image: imageUrl,
    categories: cats,
    tags: post.tags || [],
    readTime: post.minutesToRead || post.readTime || null,
    status: post.status || 'published',
  };
}

Deno.serve(async (req) => {
  try {
    const clientId = Deno.env.get('WIX_CLIENT_ID');
    if (!clientId) return Response.json({ error: 'Missing WIX_CLIENT_ID' }, { status: 500 });

    const body = await req.json().catch(() => ({}));
    const { postId, category, limit = 50, language = 'en' } = body;

    const wix = createClient({
      modules: { posts, categories },
      auth: OAuthStrategy({ clientId }),
    });

    if (postId) {
      try {
        const post = await wix.posts.getPost(postId, { language });
        return Response.json({ post: processPost(post.post || post), posts: [] });
      } catch (e) {
        console.error('[getWixBlog] Single post error:', e.message);
        return Response.json({ post: null, posts: [] });
      }
    }

    let query = wix.posts.queryPosts({ language }).limit(limit);
    if (category) query = query.hasSome('categoryIds', [category]);

    const [postsRes, categoriesRes] = await Promise.all([
      query.find().catch(e => { console.error('[getWixBlog] Posts query:', e.message); return { items: [] }; }),
      wix.categories.listCategories({ language }).catch(e => { console.error('[getWixBlog] Categories:', e.message); return { categories: [] }; }),
    ]);

    const list = (postsRes.items || []).map(processPost).filter(Boolean);
    const cats = (categoriesRes.categories || []).map(c => ({
      id: c._id || c.id,
      name: c.label || c.name,
      slug: c.slug,
    }));

    return Response.json({ posts: list, categories: cats });
  } catch (err) {
    console.error('[getWixBlog] Error:', err.message);
    return Response.json({ error: err.message, posts: [] }, { status: 500 });
  }
});
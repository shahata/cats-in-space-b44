import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function safeJson(res) {
  const text = await res.text();
  try { return text ? JSON.parse(text) : {}; } catch { return { _raw: text }; }
}

async function getAnonToken(clientId) {
  const res = await fetch("https://www.wixapis.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId, grantType: "anonymous" }),
  });
  const data = await safeJson(res);
  if (!res.ok) throw new Error("Token error: " + JSON.stringify(data));
  return data.access_token;
}

function processWixImage(val, w = 800, h = 500) {
  if (!val) return null;
  const url = typeof val === 'string' ? val : (val?.url || val?.src?.url || '');
  if (!url) return null;
  if (url.startsWith('http')) return url;
  const match = url.match(/wix:image:\/\/v1\/([^/]+)\/(.*)/);
  if (match) return `https://static.wixstatic.com/media/${match[1]}/v1/fill/w_${w},h_${h},al_c,q_90,enc_auto/${match[2]}`;
  return null;
}

function transformPost(post) {
  if (!post) return null;
  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    content: post.richContent?.nodes ? null : post.content || null,
    coverImage: processWixImage(post.coverMedia?.image?.url || post.coverMedia?.thumbnail?.url),
    author: post.owner?.authorName || post.owner?.name || 'Unknown',
    publishedDate: post.firstPublishedDate || post.publishedDate,
    minutesToRead: post.minutesToRead || 1,
    categories: (post.categoryIds || []),
    categoryLabels: (post.categories || []).map(c => c.label || c.title || c.name || ''),
    viewCount: post.viewCount || 0,
    likeCount: post.likeCount || 0,
    commentCount: post.commentCount || 0,
    pricingPlanIds: post.pricingPlanIds || [],
  };
}

Deno.serve(async (req) => {
  try {
    const clientId = Deno.env.get("WIX_CLIENT_ID");
    const instanceId = Deno.env.get("WIX_INSTANCE_ID");
    if (!clientId || !instanceId) return Response.json({ error: "Missing config" }, { status: 500 });

    const body = await req.json().catch(() => ({}));
    const { action, slug, categoryId, limit = 20, offset = 0 } = body;

    const accessToken = await getAnonToken(clientId);
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'wix-site-id': instanceId,
      'Content-Type': 'application/json',
    };

    // Fetch single post by slug
    if (action === 'getPost' && slug) {
      const res = await fetch(`https://www.wixapis.com/blog/v3/posts/slugs/${encodeURIComponent(slug)}?fieldsets=FULL`, { headers });
      const data = await safeJson(res);
      if (!res.ok) return Response.json({ error: data }, { status: res.status });
      return Response.json({ post: transformPost(data.post) });
    }

    // Fetch categories
    if (action === 'getCategories') {
      const res = await fetch('https://www.wixapis.com/blog/v3/categories?fieldsets=URL', { headers });
      const data = await safeJson(res);
      if (!res.ok) return Response.json({ categories: [] });
      const cats = (data.categories || []).map(c => ({
        id: c.id,
        label: c.label || c.title,
        slug: c.slug,
        postCount: c.postCount,
      }));
      return Response.json({ categories: cats });
    }

    // Fetch posts list
    let url = `https://www.wixapis.com/blog/v3/posts?fieldsets=FULL&paging.limit=${limit}&paging.offset=${offset}`;
    if (categoryId) url += `&categoryIds[]=${encodeURIComponent(categoryId)}`;

    const res = await fetch(url, { headers });
    const data = await safeJson(res);
    if (!res.ok) return Response.json({ error: data, posts: [] }, { status: res.status });

    const posts = (data.posts || []).map(transformPost).filter(Boolean);
    return Response.json({ posts, total: data.metaData?.total || posts.length });

  } catch (err) {
    console.error('[getWixBlog] Exception:', err.message);
    return Response.json({ error: err.message, posts: [] }, { status: 500 });
  }
});
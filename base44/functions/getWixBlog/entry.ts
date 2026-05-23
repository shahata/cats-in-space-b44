async function safeJson(res) {
  const text = await res.text();
  try { return text ? JSON.parse(text) : {}; } catch { return { _raw: text }; }
}

async function getAccessToken(clientId, clientSecret) {
  const res = await fetch("https://www.wixapis.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      clientId, 
      clientSecret,
      grantType: "client_credentials",
    }),
  });
  const data = await safeJson(res);
  if (!res.ok) throw new Error("Token error: " + JSON.stringify(data));
  return data.access_token;
}

function processPost(post) {
  if (!post) return null;
  
  // Extract image URL
  let imageUrl = null;
  if (post.featuredImage) {
    imageUrl = post.featuredImage.url;
  } else if (post.image) {
    imageUrl = typeof post.image === 'string' ? post.image : post.image.url;
  }
  
  // Extract categories
  const categories = (post.categories || []).map(c => c.name || c).filter(Boolean);
  
  return {
    id: post._id || post.id,
    title: post.title || 'Untitled Post',
    slug: post.slug,
    excerpt: post.excerpt || post.summary || '',
    content: post.body || post.content || '',
    author: post.author?.name || post.authorName || 'Unknown',
    publishedDate: post.datePublished || post.createdDate,
    updatedDate: post.dateUpdated || post.updatedDate,
    image: imageUrl,
    categories,
    tags: post.tags || [],
    readTime: post.readTime || null,
    status: post.status || 'published',
  };
}

Deno.serve(async (req) => {
  try {
    const clientId = Deno.env.get("WIX_CLIENT_ID");
    const clientSecret = Deno.env.get("WIX_CLIENT_SECRET");
    
    if (!clientId || !clientSecret) {
      return Response.json({ error: "Missing WIX_CLIENT_ID or WIX_CLIENT_SECRET" }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const { postId, category, limit = 50, language = 'en' } = body;

    const accessToken = await getAccessToken(clientId, clientSecret);
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'wix-site-id': clientId,
      'Content-Type': 'application/json',
    };

    // Get single post
    if (postId) {
      const res = await fetch(`https://www.wixapis.com/v3/posts/${postId}?language=${language}`, { 
        method: 'GET', 
        headers 
      });
      const data = await safeJson(res);
      
      if (!res.ok) {
        console.error('[getWixBlog] Single post error:', res.status, data);
        return Response.json({ post: null, posts: [] });
      }
      
      return Response.json({ 
        post: processPost(data.post || data),
        posts: []
      });
    }

    // Query posts (filtered by language)
    const queryBody = {
      language,
      query: {
        filter: category ? { categoryIds: { $hasSome: [category] } } : {},
        sort: [{ fieldName: 'firstPublishedDate', order: 'DESC' }],
        limit,
      },
    };

    const res = await fetch('https://www.wixapis.com/blog/v3/posts/query', { 
      method: 'POST',
      headers,
      body: JSON.stringify(queryBody),
    });
    const data = await safeJson(res);

    if (!res.ok) {
      console.error('[getWixBlog] Query error:', res.status, data);
      return Response.json({ posts: [], post: null });
    }

    const posts = (data.posts || []).map(processPost).filter(p => p);

    // Get categories (filtered by language)
    const categoriesRes = await fetch(`https://www.wixapis.com/v3/categories?language=${language}`, { 
      method: 'GET', 
      headers 
    });
    const categoriesData = await safeJson(categoriesRes);
    const categories = (categoriesData.categories || []).map(c => ({
      id: c._id || c.id,
      name: c.name,
      slug: c.slug,
    }));

    return Response.json({ 
      posts,
      categories,
    });

  } catch (err) {
    console.error('[getWixBlog] Error:', err.message);
    return Response.json({ error: err.message, posts: [] }, { status: 500 });
  }
});
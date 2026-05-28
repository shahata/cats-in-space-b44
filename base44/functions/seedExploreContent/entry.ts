// One-time admin seed: creates ExploreLinks (the 3 nav cards under Facilities)
// and SiteCTAs (the "Join the Crew" block) CMS collections + inserts data.
// Re-running is safe — skips existing collections and items.
import { createClient, AppStrategy } from 'npm:@wix/sdk@1.21.12';
import { items, collections } from 'npm:@wix/data@latest';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const EXPLORE_LINKS = [
  {
    title: 'Planet Database',
    description: 'All surveyed worlds ranked by habitability for feline life.',
    image: 'https://media.base44.com/images/public/6a115eeb3c3d127dbcd0a2fe/2759063ca_research.png',
    link: '/planets',
    linkText: 'Explore Planets →',
    order: 1,
  },
  {
    title: 'Crew Roster',
    description: 'The bravest cats to ever leave a perfectly good cardboard box behind.',
    image: 'https://media.base44.com/images/public/6a115eeb3c3d127dbcd0a2fe/997288998_plans.png',
    link: '/crew',
    linkText: 'Meet the Crew →',
    order: 2,
  },
  {
    title: 'Mission Control',
    description: 'Tracking every whisker-raising expedition into the unknown.',
    image: 'https://media.base44.com/images/public/6a115eeb3c3d127dbcd0a2fe/b2e26739c_log.png',
    link: '/missions',
    linkText: 'All Missions →',
    order: 3,
  },
];

const SITE_CTAS = [
  {
    key: 'join-the-crew',
    title: 'Join the Crew',
    body: "A crew membership unlocks premium Ship's Log dispatches, complimentary medical appointments, discounted tickets at The Nebula Theater, and first dibs on supply-depot restocks.",
    buttonText: 'Choose Your Rank →',
    buttonLink: '/plans',
    image: 'https://media.base44.com/images/public/6a115eeb3c3d127dbcd0a2fe/b2e26739c_log.png',
  },
];

async function ensureCollection(wix, id, displayName, fields) {
  try {
    await wix.collections.getDataCollection(id);
    return 'exists';
  } catch (_e) { /* not found, create below */ }

  await wix.collections.createDataCollection({
    _id: id,
    displayName,
    fields,
    permissions: { read: 'ANYONE', insert: 'ADMIN', update: 'ADMIN', remove: 'ADMIN' },
  });
  return 'created';
}

async function seedItems(wix, collectionId, rows, dedupeKey) {
  const existing = await wix.items.query(collectionId).limit(100).find()
    .catch(e => { console.error(`[seed] query ${collectionId}:`, e.message); return { items: [] }; });
  const existingKeys = new Set((existing.items || []).map(i => (i.data || i)[dedupeKey]));
  const inserted = [], skipped = [], errors = [];
  for (const row of rows) {
    if (existingKeys.has(row[dedupeKey])) { skipped.push(row[dedupeKey]); continue; }
    try {
      await wix.items.insert(collectionId, row);
      inserted.push(row[dedupeKey]);
    } catch (e) {
      console.error(`[seed] insert ${collectionId} ${row[dedupeKey]}:`, e.message);
      errors.push({ key: row[dedupeKey], error: e.message });
    }
  }
  return { inserted, skipped, errors };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const clientId = Deno.env.get('WIX_CLIENT_ID');
    const clientSecret = Deno.env.get('WIX_CLIENT_SECRET');
    const instanceId = Deno.env.get('WIX_INSTANCE_ID');
    if (!clientId || !clientSecret || !instanceId) {
      return Response.json({ error: 'Missing Wix admin env vars' }, { status: 500 });
    }

    const wix = createClient({
      modules: { items, collections },
      auth: AppStrategy({ appId: clientId, appSecret: clientSecret, instanceId }),
    });

    const result = {};

    result.exploreLinksCollection = await ensureCollection(wix, 'ExploreLinks', 'Explore Links', [
      { key: 'title', displayName: 'Title', type: 'TEXT' },
      { key: 'description', displayName: 'Description', type: 'TEXT' },
      { key: 'image', displayName: 'Image', type: 'TEXT' },
      { key: 'link', displayName: 'Link', type: 'TEXT' },
      { key: 'linkText', displayName: 'Link Text', type: 'TEXT' },
      { key: 'order', displayName: 'Order', type: 'NUMBER' },
    ]);
    result.exploreLinksItems = await seedItems(wix, 'ExploreLinks', EXPLORE_LINKS, 'title');

    result.siteCtasCollection = await ensureCollection(wix, 'SiteCTAs', 'Site CTAs', [
      { key: 'key', displayName: 'Key', type: 'TEXT' },
      { key: 'title', displayName: 'Title', type: 'TEXT' },
      { key: 'body', displayName: 'Body', type: 'TEXT' },
      { key: 'buttonText', displayName: 'Button Text', type: 'TEXT' },
      { key: 'buttonLink', displayName: 'Button Link', type: 'TEXT' },
      { key: 'image', displayName: 'Image', type: 'TEXT' },
    ]);
    result.siteCtasItems = await seedItems(wix, 'SiteCTAs', SITE_CTAS, 'key');

    return Response.json(result);
  } catch (err) {
    console.error('[seedExploreContent] Exception:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});
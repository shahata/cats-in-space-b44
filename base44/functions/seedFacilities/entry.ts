// One-time admin seed: creates the "Facilities" CMS collection (if missing)
// and inserts the static items currently shown on the Explore page.
// Re-running is safe — it skips collection creation if it exists and skips
// items whose `name` already exists.
import { createClient, AppStrategy } from 'npm:@wix/sdk@1.21.12';
import { items, collections } from 'npm:@wix/data@latest';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const COLLECTION_ID = 'Facilities';

const FACILITIES = [
  {
    deck: 'DECK 2',
    image: 'https://media.base44.com/images/public/6a115eeb3c3d127dbcd0a2fe/d0c360925_store.png',
    name: 'Supply Depot',
    description: 'Gear up for the mission — tactical hairballs, zero-gravity cat trees, and nebula-nip from our shop.',
    link: '/shop',
    linkText: 'Browse the shelves →',
    order: 1,
  },
  {
    deck: 'DECK 3',
    image: 'https://media.base44.com/images/public/6a115eeb3c3d127dbcd0a2fe/526689902_clinic.png',
    name: 'Medical Bay',
    description: 'Routine checkups, vaccinations against alien parasites, and that annoying hairball cough.',
    link: '/medical-bay',
    linkText: 'Book appointment →',
    order: 2,
  },
  {
    deck: 'DECK 5',
    image: 'https://media.base44.com/images/public/6a115eeb3c3d127dbcd0a2fe/236dac4c5_restaurant.png',
    name: 'The Cosmic Kitchen',
    description: 'Intergalactic cuisine, pickup and delivery across the ship. The Nebula Nachos are legendary.',
    link: '/restaurant',
    linkText: 'Order now →',
    order: 3,
  },
  {
    deck: 'DECK 7',
    image: 'https://media.base44.com/images/public/6a115eeb3c3d127dbcd0a2fe/b5b5cdceb_cinema.png',
    name: 'The Nebula Theater',
    description: 'Weekly screenings of cat-themed classics — Star Paws, The Meowtrix, Cat-ablanca — every weeknight at 20:00 sharp.',
    link: '/cinema',
    linkText: "See what's playing →",
    order: 4,
  },
];

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

    const result = { collection: 'unchanged', inserted: [], skipped: [], errors: [] };

    // 1) Ensure collection exists
    let existing = null;
    try {
      existing = await wix.collections.getDataCollection(COLLECTION_ID);
    } catch (_e) {
      existing = null;
    }

    if (!existing) {
      try {
        await wix.collections.createDataCollection({
          _id: COLLECTION_ID,
          displayName: 'Facilities',
          fields: [
            { key: 'deck', displayName: 'Deck', type: 'TEXT' },
            { key: 'name', displayName: 'Name', type: 'TEXT' },
            { key: 'image', displayName: 'Image', type: 'TEXT' },
            { key: 'description', displayName: 'Description', type: 'TEXT' },
            { key: 'link', displayName: 'Link', type: 'TEXT' },
            { key: 'linkText', displayName: 'Link Text', type: 'TEXT' },
            { key: 'order', displayName: 'Order', type: 'NUMBER' },
          ],
          permissions: {
            read: 'ANYONE',
            insert: 'ADMIN',
            update: 'ADMIN',
            remove: 'ADMIN',
          },
        });
        result.collection = 'created';
      } catch (e) {
        return Response.json({ error: `createDataCollection failed: ${e.message}` }, { status: 500 });
      }
    } else {
      result.collection = 'exists';
    }

    // 2) Read existing items to avoid duplicates (match by name)
    const existingItems = await wix.items.query(COLLECTION_ID).limit(100).find()
      .catch(e => { console.error('[seedFacilities] query existing:', e.message); return { items: [] }; });
    const existingNames = new Set((existingItems.items || []).map(i => (i.data || i).name));

    // 3) Insert missing items
    for (const f of FACILITIES) {
      if (existingNames.has(f.name)) {
        result.skipped.push(f.name);
        continue;
      }
      try {
        await wix.items.insert(COLLECTION_ID, f);
        result.inserted.push(f.name);
      } catch (e) {
        console.error('[seedFacilities] insert error:', f.name, e.message);
        result.errors.push({ name: f.name, error: e.message });
      }
    }

    return Response.json(result);
  } catch (err) {
    console.error('[seedFacilities] Exception:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});
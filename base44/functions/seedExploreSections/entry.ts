// One-time admin seed: replaces the 3 separate Explore collections
// (Facilities, ExploreLinks, SiteCTAs) with one unified "ExploreSections"
// collection that uses a `kind` field as discriminator.
//
//   kind = 'facility' | 'nav' | 'cta'
//
// Re-running is safe: existing collection / items are kept in place.
import { createClient, AppStrategy } from 'npm:@wix/sdk@1.21.12';
import { items, collections } from 'npm:@wix/data@latest';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const COLLECTION_ID = 'ExploreSections';
const LEGACY_COLLECTIONS = ['Facilities', 'ExploreLinks', 'SiteCTAs'];

const ROWS = [
  // Facilities
  { kind: 'facility', key: 'supply-depot',     subtitle: 'DECK 2', title: 'Supply Depot',        description: 'Gear up for the mission — tactical hairballs, zero-gravity cat trees, and nebula-nip from our shop.', image: 'https://media.base44.com/images/public/6a115eeb3c3d127dbcd0a2fe/d0c360925_store.png',     linkUrl: '/shop',         linkText: 'Browse the shelves →', order: 1 },
  { kind: 'facility', key: 'medical-bay',      subtitle: 'DECK 3', title: 'Medical Bay',         description: 'Routine checkups, vaccinations against alien parasites, and that annoying hairball cough.',       image: 'https://media.base44.com/images/public/6a115eeb3c3d127dbcd0a2fe/526689902_clinic.png',    linkUrl: '/medical-bay',  linkText: 'Book appointment →',   order: 2 },
  { kind: 'facility', key: 'cosmic-kitchen',   subtitle: 'DECK 5', title: 'The Cosmic Kitchen',  description: 'Intergalactic cuisine, pickup and delivery across the ship. The Nebula Nachos are legendary.',    image: 'https://media.base44.com/images/public/6a115eeb3c3d127dbcd0a2fe/236dac4c5_restaurant.png',linkUrl: '/restaurant',   linkText: 'Order now →',          order: 3 },
  { kind: 'facility', key: 'nebula-theater',   subtitle: 'DECK 7', title: 'The Nebula Theater',  description: 'Weekly screenings of cat-themed classics — Star Paws, The Meowtrix, Cat-ablanca — every weeknight at 20:00 sharp.', image: 'https://media.base44.com/images/public/6a115eeb3c3d127dbcd0a2fe/b5b5cdceb_cinema.png', linkUrl: '/cinema', linkText: "See what's playing →", order: 4 },
  // Nav links
  { kind: 'nav', key: 'planets',  subtitle: '', title: 'Planet Database', description: 'All surveyed worlds ranked by habitability for feline life.',          image: 'https://media.base44.com/images/public/6a115eeb3c3d127dbcd0a2fe/2759063ca_research.png', linkUrl: '/planets',  linkText: 'Explore Planets →', order: 1 },
  { kind: 'nav', key: 'crew',     subtitle: '', title: 'Crew Roster',     description: 'The bravest cats to ever leave a perfectly good cardboard box behind.', image: 'https://media.base44.com/images/public/6a115eeb3c3d127dbcd0a2fe/997288998_plans.png',    linkUrl: '/crew',     linkText: 'Meet the Crew →',   order: 2 },
  { kind: 'nav', key: 'missions', subtitle: '', title: 'Mission Control', description: 'Tracking every whisker-raising expedition into the unknown.',          image: 'https://media.base44.com/images/public/6a115eeb3c3d127dbcd0a2fe/b2e26739c_log.png',     linkUrl: '/missions', linkText: 'All Missions →',    order: 3 },
  // CTA
  { kind: 'cta', key: 'join-the-crew', subtitle: '', title: 'Join the Crew',
    description: "A crew membership unlocks premium Ship's Log dispatches, complimentary medical appointments, discounted tickets at The Nebula Theater, and first dibs on supply-depot restocks.",
    image: 'https://media.base44.com/images/public/6a115eeb3c3d127dbcd0a2fe/b2e26739c_log.png',
    linkUrl: '/plans', linkText: 'Choose Your Rank →', order: 1 },
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

    const result = { collection: 'unchanged', inserted: [], skipped: [], errors: [], legacyDeleted: [], legacyErrors: [] };

    // 1) Ensure unified collection exists
    let existing = null;
    try { existing = await wix.collections.getDataCollection(COLLECTION_ID); } catch { existing = null; }

    if (!existing) {
      try {
        await wix.collections.createDataCollection({
          _id: COLLECTION_ID,
          displayName: 'Explore Sections',
          fields: [
            { key: 'kind',        displayName: 'Kind (facility | nav | cta)', type: 'TEXT' },
            { key: 'key',         displayName: 'Key',                          type: 'TEXT' },
            { key: 'title',       displayName: 'Title',                        type: 'TEXT' },
            { key: 'subtitle',    displayName: 'Subtitle (e.g. Deck label)',   type: 'TEXT' },
            { key: 'description', displayName: 'Description',                  type: 'TEXT' },
            { key: 'image',       displayName: 'Image',                        type: 'TEXT' },
            { key: 'linkUrl',     displayName: 'Link URL',                     type: 'TEXT' },
            { key: 'linkText',    displayName: 'Link Text',                    type: 'TEXT' },
            { key: 'order',       displayName: 'Order',                        type: 'NUMBER' },
          ],
          permissions: { read: 'ANYONE', insert: 'ADMIN', update: 'ADMIN', remove: 'ADMIN' },
        });
        result.collection = 'created';
      } catch (e) {
        return Response.json({ error: `createDataCollection failed: ${e.message}` }, { status: 500 });
      }
    } else {
      result.collection = 'exists';
    }

    // 2) Insert items (dedupe by key)
    const existingItems = await wix.items.query(COLLECTION_ID).limit(100).find()
      .catch(e => { console.error('[seed] query existing:', e.message); return { items: [] }; });
    const existingKeys = new Set((existingItems.items || []).map(i => (i.data || i).key));

    for (const row of ROWS) {
      if (existingKeys.has(row.key)) { result.skipped.push(row.key); continue; }
      try {
        await wix.items.insert(COLLECTION_ID, row);
        result.inserted.push(row.key);
      } catch (e) {
        console.error('[seed] insert error:', row.key, e.message);
        result.errors.push({ key: row.key, error: e.message });
      }
    }

    // 3) Drop legacy collections (now superseded)
    for (const legacy of LEGACY_COLLECTIONS) {
      try {
        await wix.collections.deleteDataCollection(legacy);
        result.legacyDeleted.push(legacy);
      } catch (e) {
        // Most likely already gone — only log unexpected errors
        console.error('[seed] delete legacy:', legacy, e.message);
        result.legacyErrors.push({ collection: legacy, error: e.message });
      }
    }

    return Response.json(result);
  } catch (err) {
    console.error('[seedExploreSections] Exception:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});
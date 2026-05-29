// Admin-only seed: (re)creates the unified "ExploreSections" CMS collection
// with image stored as a proper Wix Media IMAGE field.
//
// Flow:
//   1. Upload all referenced images to Wix Media (importFile from URL).
//   2. Drop the existing ExploreSections collection if present.
//   3. Recreate it with `image` typed as IMAGE.
//   4. Insert all rows referencing the uploaded media.
import { createClient, AppStrategy } from 'npm:@wix/sdk@1.21.12';
import { items, collections } from 'npm:@wix/data@latest';
import { files } from 'npm:@wix/media@latest';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const COLLECTION_ID = 'ExploreSections';

const ROWS = [
  // Facilities
  { kind: 'facility', key: 'supply-depot',   subtitle: 'DECK 2', title: 'Supply Depot',       description: 'Gear up for the mission — tactical hairballs, zero-gravity cat trees, and nebula-nip from our shop.', sourceImage: 'https://media.base44.com/images/public/6a115eeb3c3d127dbcd0a2fe/d0c360925_store.png',      linkUrl: '/shop',        linkText: 'Browse the shelves →', order: 1 },
  { kind: 'facility', key: 'medical-bay',    subtitle: 'DECK 3', title: 'Medical Bay',        description: 'Routine checkups, vaccinations against alien parasites, and that annoying hairball cough.',       sourceImage: 'https://media.base44.com/images/public/6a115eeb3c3d127dbcd0a2fe/526689902_clinic.png',     linkUrl: '/medical-bay', linkText: 'Book appointment →',   order: 2 },
  { kind: 'facility', key: 'cosmic-kitchen', subtitle: 'DECK 5', title: 'The Cosmic Kitchen', description: 'Intergalactic cuisine, pickup and delivery across the ship. The Nebula Nachos are legendary.',    sourceImage: 'https://media.base44.com/images/public/6a115eeb3c3d127dbcd0a2fe/236dac4c5_restaurant.png', linkUrl: '/restaurant',  linkText: 'Order now →',          order: 3 },
  { kind: 'facility', key: 'nebula-theater', subtitle: 'DECK 7', title: 'The Nebula Theater', description: 'Weekly screenings of cat-themed classics — Star Paws, The Meowtrix, Cat-ablanca — every weeknight at 20:00 sharp.', sourceImage: 'https://media.base44.com/images/public/6a115eeb3c3d127dbcd0a2fe/b5b5cdceb_cinema.png', linkUrl: '/cinema', linkText: "See what's playing →", order: 4 },
  // Nav links
  { kind: 'nav', key: 'planets',  subtitle: '', title: 'Planet Database', description: 'All surveyed worlds ranked by habitability for feline life.',          sourceImage: 'https://media.base44.com/images/public/6a115eeb3c3d127dbcd0a2fe/2759063ca_research.png', linkUrl: '/planets',  linkText: 'Explore Planets →', order: 1 },
  { kind: 'nav', key: 'crew',     subtitle: '', title: 'Crew Roster',     description: 'The bravest cats to ever leave a perfectly good cardboard box behind.', sourceImage: 'https://media.base44.com/images/public/6a115eeb3c3d127dbcd0a2fe/997288998_plans.png',    linkUrl: '/crew',     linkText: 'Meet the Crew →',   order: 2 },
  { kind: 'nav', key: 'missions', subtitle: '', title: 'Mission Control', description: 'Tracking every whisker-raising expedition into the unknown.',          sourceImage: 'https://media.base44.com/images/public/6a115eeb3c3d127dbcd0a2fe/b2e26739c_log.png',     linkUrl: '/missions', linkText: 'All Missions →',    order: 3 },
  // CTA
  { kind: 'cta', key: 'join-the-crew', subtitle: '', title: 'Join the Crew',
    description: "A crew membership unlocks premium Ship's Log dispatches, complimentary medical appointments, discounted tickets at The Nebula Theater, and first dibs on supply-depot restocks.",
    sourceImage: 'https://media.base44.com/images/public/6a115eeb3c3d127dbcd0a2fe/b2e26739c_log.png',
    linkUrl: '/plans', linkText: 'Choose Your Rank →', order: 1 },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    let body = {};
    try { body = await req.json(); } catch {}
    const action = body?.action || 'seed'; // 'seed' | 'dedupe'

    const clientId = Deno.env.get('WIX_CLIENT_ID');
    const clientSecret = Deno.env.get('WIX_CLIENT_SECRET');
    const instanceId = Deno.env.get('WIX_INSTANCE_ID');
    if (!clientId || !clientSecret || !instanceId) {
      return Response.json({ error: 'Missing Wix admin env vars' }, { status: 500 });
    }

    const wix = createClient({
      modules: { items, collections, files },
      auth: AppStrategy({ appId: clientId, appSecret: clientSecret, instanceId }),
    });

    // Dedupe mode: keep one record per `key`, delete the rest.
    if (action === 'dedupe') {
      const out = { kept: [], deleted: [], errors: [] };
      const listed = await wix.items.query(COLLECTION_ID).limit(100).find();
      const byKey = {};
      for (const it of listed.items) {
        if (!byKey[it.key]) { byKey[it.key] = it; out.kept.push({ key: it.key, _id: it._id }); }
        else {
          try {
            await wix.items.remove(COLLECTION_ID, it._id);
            out.deleted.push({ key: it.key, _id: it._id });
          } catch (e) {
            out.errors.push({ key: it.key, _id: it._id, error: e.message });
          }
        }
      }
      return Response.json(out);
    }

    const result = { uploads: [], collection: 'unchanged', inserted: [], errors: [] };

    // 1) Upload each unique source image to Wix Media via REST
    // (SDK importFile returned opaque 400 errors — REST works with the
    //  explicit wix-site-id header.)
    const uniqueUrls = [...new Set(ROWS.map(r => r.sourceImage))];
    const urlToWixImage = {};

    // Get an access token from AppStrategy for direct REST calls
    const auth = AppStrategy({ appId: clientId, appSecret: clientSecret, instanceId });
    const tokens = await auth.getAuthHeaders();
    const accessToken = tokens?.headers?.Authorization || tokens?.Authorization || '';
    result.debug = { hasToken: !!accessToken, tokenPrefix: accessToken.slice(0, 20) };

    for (const url of uniqueUrls) {
      const displayName = (url.split('/').pop() || 'image').split('?')[0] || 'image.png';
      try {
        const restRes = await fetch('https://www.wixapis.com/site-media/v1/files/import', {
          method: 'POST',
          headers: {
            'Authorization': accessToken,
            'Content-Type': 'application/json',
            'wix-site-id': Deno.env.get('WIX_SITE_ID') || '',
          },
          body: JSON.stringify({ url, mimeType: 'image/png', displayName: displayName.endsWith('.png') ? displayName : displayName + '.png' }),
        });
        const text = await restRes.text();
        if (!restRes.ok) {
          result.errors.push({ stage: 'upload', url, status: restRes.status, body: text.slice(0, 500) });
          continue;
        }
        const json = JSON.parse(text);
        const fileUrl = json?.file?.url;
        const fileId = json?.file?.id;
        if (!fileUrl) throw new Error('No file url in response: ' + text.slice(0, 200));
        // CMS IMAGE field expects: wix:image://v1/{fileId}/{displayName}
        const wixImageUri = `wix:image://v1/${fileId}/${encodeURIComponent(json.file.displayName || displayName)}`;
        urlToWixImage[url] = wixImageUri;
        result.uploads.push({ source: displayName, fileId, wixImageUri });
      } catch (e) {
        result.errors.push({ stage: 'upload', url, error: e.message });
      }
    }

    if (Object.keys(urlToWixImage).length === 0) {
      return Response.json({ error: 'All image uploads failed', detail: result }, { status: 500 });
    }

    // 2) Drop existing collection (schema change: image TEXT -> IMAGE)
    try {
      await wix.collections.deleteDataCollection(COLLECTION_ID);
    } catch (e) {
      // ok if it didn't exist
      console.log('[seed] deleteDataCollection note:', e.message);
    }

    // 3) Recreate with IMAGE-type image field
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
          { key: 'image',       displayName: 'Image',                        type: 'IMAGE' },
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

    // 4) Insert items with Wix media references
    for (const row of ROWS) {
      const { sourceImage, ...rest } = row;
      const wixImage = urlToWixImage[sourceImage];
      if (!wixImage) {
        result.errors.push({ stage: 'insert', key: row.key, error: 'no uploaded image' });
        continue;
      }
      try {
        await wix.items.insert(COLLECTION_ID, { ...rest, image: wixImage });
        result.inserted.push(row.key);
      } catch (e) {
        console.error('[seed] insert error:', row.key, e.message);
        result.errors.push({ stage: 'insert', key: row.key, error: e.message });
      }
    }

    return Response.json(result);
  } catch (err) {
    console.error('[seedExploreSections] Exception:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});
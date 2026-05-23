import { createClient, OAuthStrategy } from 'npm:@wix/sdk@1.21.12';
import { contacts } from 'npm:@wix/crm@1.0.1536';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const clientId = Deno.env.get('WIX_CLIENT_ID');
    if (!clientId) return Response.json({ error: 'Missing WIX_CLIENT_ID' }, { status: 500 });

    const wix = createClient({
      modules: { contacts },
      auth: OAuthStrategy({ clientId }),
    });

    const firstName = user.full_name?.split(' ')[0] || user.full_name || '';
    const lastName = user.full_name?.split(' ').slice(1).join(' ') || '';

    const queryRes = await wix.contacts
      .queryContacts()
      .eq('info.emails.email', user.email)
      .find()
      .catch(e => {
        console.error('[syncWixMember] query:', e.message);
        return { items: [] };
      });

    const existing = queryRes.items?.[0];

    const contactInfo = {
      name: { first: firstName, last: lastName },
      emails: { items: [{ email: user.email, primary: true }] },
    };

    if (existing) {
      await wix.contacts
        .updateContact(existing._id, contactInfo, existing.revision)
        .catch(e => console.error('[syncWixMember] update:', e.message));
      return Response.json({ synced: true, contactId: existing._id });
    }

    const newContact = await wix.contacts
      .createContact(contactInfo, { allowDuplicates: false })
      .catch(e => {
        console.error('[syncWixMember] create:', e.message);
        return null;
      });

    return Response.json({ synced: true, contactId: newContact?.contact?._id || newContact?._id || null });
  } catch (err) {
    console.error('[syncWixMember] Exception:', err.message);
    return Response.json({ error: err.message, synced: false }, { status: 500 });
  }
});
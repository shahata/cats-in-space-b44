import { createClient, OAuthStrategy } from 'npm:@wix/sdk@1.21.12';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const clientId = Deno.env.get('WIX_CLIENT_ID');
    if (!clientId) return Response.json({ error: 'Missing WIX_CLIENT_ID' }, { status: 500 });

    const wix = createClient({
      auth: OAuthStrategy({ clientId }),
    });

    // Search for existing contact by email
    const searchRes = await wix
      .fetch('https://www.wixapis.com/crm/v1/contacts/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: {
            filter: JSON.stringify({ fieldName: 'info.emails.email', value: user.email }),
          },
        }),
      })
      .then(r => r.json())
      .catch(e => {
        console.error('[syncWixMember] search:', e.message);
        return { contacts: [] };
      });

    const existing = searchRes.contacts?.[0];

    const contactData = {
      info: {
        firstName: user.full_name?.split(' ')[0] || user.full_name || '',
        lastName: user.full_name?.split(' ').slice(1).join(' ') || '',
        emails: { emails: [user.email] },
      },
    };

    if (existing) {
      await wix
        .fetch(`https://www.wixapis.com/crm/v1/contacts/${existing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(contactData),
        })
        .catch(e => {
          console.error('[syncWixMember] update:', e.message);
        });
      return Response.json({ synced: true, contactId: existing.id });
    }

    const newRes = await wix
      .fetch('https://www.wixapis.com/crm/v1/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactData),
      })
      .then(r => r.json())
      .catch(e => {
        console.error('[syncWixMember] create:', e.message);
        return null;
      });

    return Response.json({ synced: true, contactId: newRes?.id || null });
  } catch (err) {
    console.error('[syncWixMember] Exception:', err.message);
    return Response.json({ error: err.message, synced: false }, { status: 500 });
  }
});
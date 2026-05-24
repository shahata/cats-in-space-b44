import { createClient, OAuthStrategy, AppStrategy } from 'npm:@wix/sdk@1.21.12';
import { members } from 'npm:@wix/members@1.0.246';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const clientId = Deno.env.get('WIX_CLIENT_ID');
    const clientSecret = Deno.env.get('WIX_CLIENT_SECRET');
    const instanceId = Deno.env.get('WIX_INSTANCE_ID');
    if (!clientId || !clientSecret || !instanceId) {
      return Response.json({ error: 'Missing Wix credentials' }, { status: 500 });
    }

    // Admin client via AppStrategy for member management
    const admin = createClient({
      modules: { members },
      auth: AppStrategy({ appId: clientId, appSecret: clientSecret, instanceId }),
    });

    // Find existing member by login email
    const { items } = await admin.members
      .queryMembers()
      .eq('loginEmail', user.email)
      .find()
      .catch(e => {
        console.error('[syncWixMember] queryMembers:', e.message);
        return { items: [] };
      });

    let member = items?.[0];

    if (!member) {
      const created = await admin.members.createMember({
        member: {
          loginEmail: user.email,
          status: members.Status?.APPROVED || 'APPROVED',
          privacyStatus: members.PrivacyStatusStatus?.PRIVATE || 'PRIVATE',
          contact: {
            firstName: user.full_name?.split(' ')[0] || user.full_name || '',
            lastName: user.full_name?.split(' ').slice(1).join(' ') || '',
          },
        },
      }).catch(e => {
        console.error('[syncWixMember] createMember:', e.message);
        return null;
      });
      member = created?.member || created;
    }

    if (!member?._id) {
      return Response.json({ error: 'Could not resolve member' }, { status: 500 });
    }

    // Visitor-scoped OAuth client to mint member tokens.
    // getMemberTokensForExternalLogin(memberId, apiKey) per Wix docs.
    // We pass clientSecret as the "apiKey" arg — user requested this attempt.
    const wix = createClient({ auth: OAuthStrategy({ clientId }) });

    let memberTokens = null;
    let mintError = null;
    try {
      memberTokens = await wix.auth.getMemberTokensForExternalLogin(
        member._id,
        clientSecret
      );
    } catch (e) {
      mintError = e?.message || String(e);
      console.error('[syncWixMember] getMemberTokensForExternalLogin:', mintError, e?.details || '');
    }

    return Response.json({
      synced: true,
      memberId: member._id,
      tokens: memberTokens,
      mintError,
    });
  } catch (err) {
    console.error('[syncWixMember] Exception:', err.message);
    return Response.json({ error: err.message, synced: false }, { status: 500 });
  }
});
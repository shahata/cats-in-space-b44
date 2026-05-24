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
    const apiKey = Deno.env.get('WIX_API_KEY');
    if (!clientId || !clientSecret || !instanceId || !apiKey) {
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
    let capturedRequest = null;

    // Monkey-patch fetch to capture the exact outbound request
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input, init) => {
      const url = typeof input === 'string' ? input : input?.url;
      if (url && url.includes('wixapis.com')) {
        capturedRequest = {
          url,
          method: init?.method || 'GET',
          headers: init?.headers ? Object.fromEntries(
            init.headers instanceof Headers
              ? init.headers.entries()
              : Object.entries(init.headers)
          ) : {},
          body: init?.body ? (typeof init.body === 'string' ? init.body : '[non-string body]') : null,
        };
        // Redact secrets for logging
        const safeHeaders = { ...capturedRequest.headers };
        if (safeHeaders.Authorization) safeHeaders.Authorization = `[REDACTED len=${safeHeaders.Authorization.length}]`;
        if (safeHeaders.authorization) safeHeaders.authorization = `[REDACTED len=${safeHeaders.authorization.length}]`;
        console.log('[syncWixMember] OUTBOUND fetch:', JSON.stringify({ ...capturedRequest, headers: safeHeaders }, null, 2));
      }
      return originalFetch(input, init);
    };

    try {
      memberTokens = await wix.auth.getMemberTokensForExternalLogin(
        member._id,
        apiKey
      );
    } catch (e) {
      mintError = e?.message || String(e);
      console.error('[syncWixMember] getMemberTokensForExternalLogin:', mintError, e?.details || '');
    } finally {
      globalThis.fetch = originalFetch;
    }

    // Redact Authorization header for response too
    const safeCaptured = capturedRequest ? {
      ...capturedRequest,
      headers: Object.fromEntries(
        Object.entries(capturedRequest.headers).map(([k, v]) =>
          /authorization/i.test(k) ? [k, `[REDACTED len=${String(v).length}]`] : [k, v]
        )
      ),
    } : null;

    return Response.json({
      synced: true,
      memberId: member._id,
      tokens: memberTokens,
      mintError,
      capturedRequest: safeCaptured,
    });
  } catch (err) {
    console.error('[syncWixMember] Exception:', err.message);
    return Response.json({ error: err.message, synced: false }, { status: 500 });
  }
});
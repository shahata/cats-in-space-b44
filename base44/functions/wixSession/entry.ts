// Returns Wix tokens for the current user.
// - If logged in: mint member tokens via AppStrategy+OAuthStrategy combo.
// - If not logged in: generate fresh visitor tokens.
import { createClient, OAuthStrategy, AppStrategy } from 'npm:@wix/sdk@1.21.12';
import { members } from 'npm:@wix/members@1.0.246';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const clientId = Deno.env.get('WIX_CLIENT_ID');
    const clientSecret = Deno.env.get('WIX_CLIENT_SECRET');
    const instanceId = Deno.env.get('WIX_INSTANCE_ID');
    const apiKey = Deno.env.get('WIX_API_KEY');
    if (!clientId) return Response.json({ error: 'Missing WIX_CLIENT_ID' }, { status: 500 });

    const wix = createClient({ auth: OAuthStrategy({ clientId }) });

    // Try to identify the current Base44 user (optional)
    let user = null;
    try {
      const base44 = createClientFromRequest(req);
      user = await base44.auth.me();
    } catch { /* visitor */ }

    // Visitor path
    if (!user || !clientSecret || !instanceId || !apiKey) {
      const visitorTokens = await wix.auth.generateVisitorTokens().catch(e => {
        console.error('[wixSession] visitor tokens:', e.message);
        return null;
      });
      return Response.json({ kind: 'visitor', tokens: visitorTokens });
    }

    // Member path — find member, mint tokens
    const admin = createClient({
      modules: { members },
      auth: AppStrategy({ appId: clientId, appSecret: clientSecret, instanceId }),
    });

    const { items } = await admin.members
      .queryMembers()
      .eq('loginEmail', user.email)
      .find()
      .catch(e => {
        console.error('[wixSession] queryMembers:', e.message);
        return { items: [] };
      });

    const member = items?.[0];
    if (!member?._id) {
      const visitorTokens = await wix.auth.generateVisitorTokens().catch(() => null);
      return Response.json({ kind: 'visitor', tokens: visitorTokens, reason: 'no_member' });
    }

    // SDK builds Authorization as `${accessToken},${apiKey}` — mint visitor
    // tokens first so accessToken isn't empty (otherwise Wix returns
    // `unauthorized_client`).
    const visitorTokens = await wix.auth.generateVisitorTokens().catch(e => {
      console.error('[wixSession] visitor tokens for mint:', e.message);
      return null;
    });
    if (visitorTokens) wix.auth.setTokens(visitorTokens);

    const memberTokens = await wix.auth.getMemberTokensForExternalLogin(
      member._id,
      apiKey
    ).catch(e => {
      console.error('[wixSession] mint tokens:', e.message);
      return null;
    });

    if (!memberTokens) {
      const visitorTokens = await wix.auth.generateVisitorTokens().catch(() => null);
      return Response.json({ kind: 'visitor', tokens: visitorTokens, reason: 'mint_failed' });
    }

    return Response.json({ kind: 'member', memberId: member._id, tokens: memberTokens });
  } catch (err) {
    console.error('[wixSession] Exception:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});
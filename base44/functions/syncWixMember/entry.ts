import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function getSiteToken(clientId, clientSecret) {
  const res = await fetch("https://www.wixapis.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId, clientSecret, grantType: "client_credentials" }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error("Failed to get site token: " + JSON.stringify(data));
  return data.access_token;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const clientId = Deno.env.get("WIX_CLIENT_ID");
    const clientSecret = Deno.env.get("WIX_CLIENT_SECRET");
    const instanceId = Deno.env.get("WIX_INSTANCE_ID");
    if (!clientId || !clientSecret || !instanceId) {
      return Response.json({ error: "Missing Wix credentials" }, { status: 500 });
    }

    const accessToken = await getSiteToken(clientId, clientSecret);

    const nameParts = (user.full_name || "").split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    const memberRes = await fetch("https://www.wixapis.com/members/v1/members", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "wix-site-id": instanceId,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        member: {
          loginEmail: user.email,
          contact: {
            firstName,
            lastName,
          },
        },
      }),
    });

    const memberData = await memberRes.json();

    // 409 means member already exists — that's fine
    if (!memberRes.ok && memberRes.status !== 409) {
      return Response.json({ error: memberData }, { status: memberRes.status });
    }

    return Response.json({ success: true, member: memberData.member || null });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
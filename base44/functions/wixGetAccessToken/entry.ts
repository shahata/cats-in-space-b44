Deno.serve(async (req) => {
  try {
    const clientId = Deno.env.get("WIX_CLIENT_ID");
    const clientSecret = Deno.env.get("WIX_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      return Response.json({ error: "Missing Wix credentials" }, { status: 500 });
    }

    const response = await fetch("https://www.wixapis.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return Response.json({ error: data }, { status: response.status });
    }

    return Response.json({ accessToken: data.access_token });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
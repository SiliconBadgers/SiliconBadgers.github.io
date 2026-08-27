export default {
  async fetch(request, env) {
    const ALLOWED_ORIGIN = "https://siliconbadgers.com";
    const cors = {
      "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors });
    }
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: cors });
    }

    let data;
    try {
      data = await request.json();
    } catch (e) {
      return new Response("Bad request", { status: 400, headers: cors });
    }

    const name = (data.name || "").toString().trim().slice(0, 200);
    const email = (data.email || "").toString().trim().slice(0, 200);
    const message = (data.message || "").toString().trim().slice(0, 4000);

    if (!name || !email || !message) {
      return new Response("Missing fields", { status: 400, headers: cors });
    }

    const text = [
      ":mailbox_with_mail: *New message from the website contact form*",
      `*From:* ${name} (${email})`,
      `*Message:*\n${message}`,
    ].join("\n");

    const slackRes = await fetch(env.SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (!slackRes.ok) {
      return new Response("Upstream error", { status: 502, headers: cors });
    }
    return new Response("OK", { status: 200, headers: cors });
  },
};

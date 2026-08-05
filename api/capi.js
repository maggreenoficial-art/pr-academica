const PIXEL_ID = process.env.META_PIXEL_ID || "1420932603427637";
const ACCESS_TOKEN = process.env.META_CAPI_ACCESS_TOKEN;
const ALLOWED_EVENTS = new Set(["PageView", "Contact", "Lead", "ViewContent"]);

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  return req.headers["x-real-ip"] || req.socket?.remoteAddress || undefined;
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!ACCESS_TOKEN) {
    return res.status(500).json({ error: "META_CAPI_ACCESS_TOKEN not configured" });
  }

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const eventName = body.event_name;
  const eventId = body.event_id;

  if (!ALLOWED_EVENTS.has(eventName) || !eventId) {
    return res.status(400).json({ error: "Invalid event payload" });
  }

  const payload = {
    data: [
      {
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,
        event_source_url: body.event_source_url || undefined,
        action_source: "website",
        user_data: {
          client_ip_address: getClientIp(req),
          client_user_agent: req.headers["user-agent"] || undefined,
          fbp: body.fbp || undefined,
          fbc: body.fbc || undefined,
        },
      },
    ],
  };

  try {
    const url = `https://graph.facebook.com/v21.0/${PIXEL_ID}/events?access_token=${encodeURIComponent(ACCESS_TOKEN)}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();

    if (!response.ok) {
      return res.status(502).json({ error: "Meta API error", details: data });
    }

    return res.status(200).json({ ok: true, events_received: data.events_received });
  } catch (error) {
    return res.status(500).json({ error: "Failed to send event" });
  }
};

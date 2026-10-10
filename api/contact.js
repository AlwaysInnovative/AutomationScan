const { configured: emailConfigured, sendEmail } = require("./_mailer");

const ALLOWED_ORIGINS = new Set([
  "https://automation-scan-neon.vercel.app",
  "https://automation-scan-7rg404ewn-alwaysinnovatives-projects.vercel.app"
]);
function cors(res, origin) {
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGINS.has(origin) ? origin : "https://automation-scan-neon.vercel.app");
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store");
}
function emailOk(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
function field(v, max) { return String(v || "").trim().slice(0, max); }

module.exports = async function handler(req, res) {
  cors(res, req.headers.origin || "");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  try {
    const body = req.body || {};
    if (body.website) return res.status(400).json({ error: "invalid_request" });
    const name = field(body.name, 80);
    const email = field(body.email, 160).toLowerCase();
    const subject = field(body.subject, 140);
    const message = field(body.message, 2000);
    if (!name || !emailOk(email) || !subject || !message || body.consent !== true) return res.status(400).json({ error: "required_fields" });

    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return res.status(503).json({ error: "contact_storage_not_configured" });

    const ip = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown").split(",")[0].slice(0, 100);
    const rateResponse = await fetch(url + "/rest/v1/rpc/consume_api_rate_limit", {
      method: "POST",
      headers: { apikey: key, Authorization: "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({ p_rate_key: "contact:" + ip, p_limit: 5, p_window_seconds: 300 })
    });
    if (rateResponse.ok && (await rateResponse.json()) !== true) return res.status(429).json({ error: "Too many messages. Please try again later." });

    const source = body.source && typeof body.source === "object" ? body.source : {};
    const stored = await fetch(url + "/rest/v1/lead_submissions", {
      method: "POST",
      headers: { apikey: key, Authorization: "Bearer " + key, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({
        lead_type: "contact", email, name, report_consent: true, marketing_consent: false,
        subject, message, source, report_summary: { contact_request: true },
        email_delivery_status: emailConfigured() ? "pending" : "not_configured", crm_sync_status: "not_requested"
      })
    });
    if (!stored.ok) return res.status(502).json({ error: "contact_storage_failed" });
    const storedRows = await stored.json();
    const leadId = storedRows && storedRows[0] ? storedRows[0].id : null;

    const owner = process.env.LEAD_NOTIFICATION_TO;
    if (!emailConfigured() || !owner) {
      if (leadId) await fetch(url + "/rest/v1/lead_submissions?id=eq." + encodeURIComponent(leadId), {
        method: "PATCH",
        headers: { apikey: key, Authorization: "Bearer " + key, "Content-Type": "application/json" },
        body: JSON.stringify({ email_delivery_status: "not_configured" })
      }).catch(() => {});
      return res.status(202).json({ ok: true, leadStored: true, emailQueued: false, configurationPending: true });
    }

    const safe = "Name: " + name + "\nEmail: " + email +
      "\nSubject: " + subject +
      "\nLead source: " + (field(source.utm_source, 100) || "direct") + " / " + (field(source.utm_medium, 100) || "(none)") +
      "\nLanding page: " + (field(source.landing_page, 200) || "/") +
      "\nReferrer: " + (field(source.referrer, 500) || "(none)") +
      "\n\nMessage:\n" + message;

    const sent = await sendEmail({
      to: owner, subject: "AutomationScan contact: " + subject, text: safe,
      idempotencyKey: "contact:" + String(leadId || Date.now())
    });
    if (leadId) await fetch(url + "/rest/v1/lead_submissions?id=eq." + encodeURIComponent(leadId), {
      method: "PATCH",
      headers: { apikey: key, Authorization: "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({ email_delivery_status: sent.ok ? "sent" : "failed" })
    }).catch(() => {});
    if (!sent.ok) return res.status(502).json({ error: "email_delivery_failed", leadStored: true });
    return res.status(200).json({ ok: true, leadStored: true, crmSynced: false });
  } catch (_) {
    return res.status(500).json({ error: "server_error" });
  }
};

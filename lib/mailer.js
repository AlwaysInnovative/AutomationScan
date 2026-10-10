const nodemailer = require("nodemailer");

function configured() {
  return Boolean(
    process.env.GMAIL_USER &&
    process.env.GMAIL_APP_PASSWORD
  ) || Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM);
}

async function sendEmail({ to, subject, text, idempotencyKey }) {
  const gmailUser = String(process.env.GMAIL_USER || "").trim();
  const gmailPassword = String(process.env.GMAIL_APP_PASSWORD || "").replace(/\s+/g, "");

  if (gmailUser && gmailPassword) {
    try {
      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: { user: gmailUser, pass: gmailPassword },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000
      });
      const info = await transporter.sendMail({
        from: { name: "AutomationScan", address: gmailUser },
        to,
        subject,
        text
      });
      return { ok: true, provider: "gmail_smtp", messageId: info.messageId };
    } catch (error) {
      // Do not fall back automatically after SMTP is configured: that could
      // create duplicate messages if Gmail accepted a message before timeout.
      return { ok: false, provider: "gmail_smtp", error: String(error && error.code || "smtp_send_failed") };
    }
  }

  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (key && from) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + key,
          ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {})
        },
        body: JSON.stringify({ from, to: Array.isArray(to) ? to : [to], subject, text })
      });
      return { ok: response.ok, provider: "resend", error: response.ok ? undefined : "resend_send_failed" };
    } catch (_) {
      return { ok: false, provider: "resend", error: "resend_request_failed" };
    }
  }
  return { ok: false, provider: "not_configured", error: "email_not_configured" };
}

module.exports = { configured, sendEmail };

/* Email is OFF until configured. With RESEND_API_KEY and MAIL_FROM set, mail goes through Resend's HTTP API.
 * Nothing pretends to send: if mail isn't configured, features that need it are hidden. */
export const mailConfigured = () => !!(process.env.RESEND_API_KEY && process.env.MAIL_FROM);
export async function sendMail({ to, subject, text }) {
  if (!mailConfigured()) throw new Error('Email is not configured.');
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: process.env.MAIL_FROM, to: [to], subject, text }),
  });
  if (!r.ok) throw new Error(`Email failed (${r.status}).`);
}

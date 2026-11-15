import "server-only";
import nodemailer from "nodemailer";

/**
 * Optional bonus: email the seller when a buyer messages them.
 * Enabled only when GMAIL_USER and GMAIL_APP_PASSWORD are set (server-side
 * secrets in Vercel — never NEXT_PUBLIC). Without them, messages are still
 * saved in Supabase; nothing is sent.
 */
const user = process.env.GMAIL_USER;
const pass = process.env.GMAIL_APP_PASSWORD;

export const emailEnabled = Boolean(user && pass);

const transport = emailEnabled
  ? nodemailer.createTransport({ service: "gmail", auth: { user, pass } })
  : null;

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export async function emailSeller(input: {
  sellerEmail: string;
  buyerEmail: string;
  listingTitle: string;
  message: string;
  listingUrl: string;
}): Promise<void> {
  if (!transport || !user) return;

  const title = input.listingTitle.replace(/[\r\n]+/g, " ").slice(0, 80);
  await transport.sendMail({
    from: { name: "Marketplace", address: user },
    to: input.sellerEmail,
    replyTo: input.buyerEmail, // seller just hits Reply to answer the buyer
    subject: `New message about "${title}"`,
    text: [
      `Someone is interested in your listing "${title}".`,
      "",
      input.message,
      "",
      `Reply to this email to answer them (${input.buyerEmail}).`,
      `View the listing: ${input.listingUrl}`,
    ].join("\n"),
    html: `
      <div style="font-family:system-ui,sans-serif;font-size:15px;color:#050505;max-width:520px">
        <p>Someone is interested in your listing <strong>${escapeHtml(title)}</strong>.</p>
        <blockquote style="margin:16px 0;padding:12px 16px;background:#f0f2f5;border-radius:8px;white-space:pre-wrap">${escapeHtml(input.message)}</blockquote>
        <p>Reply to this email to answer them (<a href="mailto:${escapeHtml(input.buyerEmail)}">${escapeHtml(input.buyerEmail)}</a>).</p>
        <p><a href="${escapeHtml(input.listingUrl)}" style="color:#0866ff">View the listing</a></p>
      </div>`,
  });
}

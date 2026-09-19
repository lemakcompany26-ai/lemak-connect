import { secrets } from 'base44:runtime';

// ---------- Centralized transactional email system (Resend) ----------
// Server-side only — RESEND_API_KEY never leaves this runtime, is never
// returned to callers and never logged. Every send is recorded in EmailLog
// and deduplicated on (emailType + transactionId + recipientEmail).

export const SUPPORT_EMAIL = 'lemakcompany26@gmail.com';
export const SUPPORT_PHONE = '09022143559';
export const COMPANY_ADDRESS = 'No. 2 Opeyemi, Zone 2, Alakia, Ibadan, Nigeria';
export const EMAIL_LOGO_URL = 'https://media.base44.com/images/public/6aac39a1738410bf82b900f5/c46723cf5_generated_image.png';
export const APP_URL = 'https://lemakconnect.base44.app';

const money = (n) => `₦${Number(n || 0).toLocaleString()}`;
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const when = (iso) => iso ? new Date(iso).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' }) : '';

function tableHtml(pairs) {
  const rows = (pairs || []).filter(([, v]) => v !== undefined && v !== null && String(v) !== '');
  if (!rows.length) return '';
  return `<table style="width:100%;border-collapse:collapse;margin:16px 0;background:#f8fafc;border-radius:12px">` +
    rows.map(([k, v]) =>
      `<tr><td style="padding:8px 14px;color:#64748b;font-size:13px">${k}</td>` +
      `<td style="padding:8px 14px;color:#0f172a;font-size:13px;font-weight:700;text-align:right">${v}</td></tr>`
    ).join('') + `</table>`;
}

function brandEmail({ title, intro, rows, ctaText, ctaPath, note }) {
  const cta = ctaText
    ? `<a href="${APP_URL}${ctaPath || '/app'}" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 24px;border-radius:10px;margin-top:8px">${esc(ctaText)}</a>`
    : '';
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Arial,Helvetica,sans-serif;background:#eef2f7;margin:0;padding:24px">
<div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">
  <div style="background:linear-gradient(135deg,#0066FF 0%,#0f172a 100%);padding:22px 24px">
    <table style="border-collapse:collapse"><tr>
      <td style="padding-right:14px"><img src="${EMAIL_LOGO_URL}" width="42" height="42" alt="Lemak Connect" style="border-radius:10px;display:block;border:0"/></td>
      <td>
        <div style="color:#ffffff;font-size:19px;font-weight:800;letter-spacing:1px">LEMAK CONNECT</div>
        <div style="color:#93c5fd;font-size:11px;margin-top:4px;letter-spacing:2px">DIGITAL SERVICES, SIMPLIFIED</div>
      </td>
    </tr></table>
  </div>
  <div style="padding:26px 24px">
    <h2 style="color:#0f172a;font-size:19px;margin:0 0 10px">${esc(title)}</h2>
    <div style="color:#334155;font-size:14px;line-height:1.7">${intro}</div>
    ${tableHtml(rows)}
    ${cta}
    ${note ? `<div style="color:#64748b;font-size:12px;margin-top:14px;line-height:1.6">${note}</div>` : ''}
  </div>
  <div style="padding:18px 24px;background:#0f172a;color:#94a3b8;font-size:12px;line-height:1.7">
    <b style="color:#e2e8f0">LEMAK CONNECT</b><br/>
    ${COMPANY_ADDRESS}<br/>
    Support: <a href="mailto:${SUPPORT_EMAIL}" style="color:#60a5fa">${SUPPORT_EMAIL}</a><br/>
    WhatsApp/Phone: ${SUPPORT_PHONE}<br/>
    <a href="${APP_URL}/privacy" style="color:#60a5fa">Privacy Policy</a> &middot; <a href="${APP_URL}/terms" style="color:#60a5fa">Terms &amp; Conditions</a>
  </div>
</div></body></html>`;
}

// Template registry. pref = the NotificationPreference flag consulted before
// sending; null means the email is mandatory (security) or has no preference.
const txRows = (d) => [
  ['Service', esc(d.service)],
  ['Amount', money(d.amount)],
  ['Transaction ID', esc(d.transactionId)],
  ['Status', esc(d.status)],
  ['Date', when(d.date)]
];

export const TEMPLATES = {
  WELCOME: {
    pref: 'systemAlerts',
    make: (d, name) => ({
      subject: 'Welcome to Lemak Connect',
      title: 'Welcome to Lemak Connect 🎉',
      intro: `<p>Hi <b>${esc(name || d.name || 'there')}</b>,</p>
        <p>Your account is ready and your wallet has been created with a starting balance of <b>₦0.00</b>.</p>
        <p>Fund your wallet to enjoy instant airtime, data, bills, virtual numbers and more.</p>`,
      ctaText: 'Open your dashboard', ctaPath: '/app'
    })
  },
  ACCOUNT_VERIFICATION: {
    pref: null,
    make: (d) => ({
      subject: 'Verify your Lemak Connect email',
      title: 'Verify your email',
      intro: `<p>Use the verification code below to finish setting up your account. If you didn't request this, you can ignore this email.</p>`,
      rows: [['Verification code', `<b style="font-size:16px">${esc(d.code)}</b>`]],
      ctaText: 'Open the app', ctaPath: '/login'
    })
  },
  PASSWORD_RESET: {
    pref: null,
    make: (d) => ({
      subject: 'Reset your Lemak Connect password',
      title: 'Password reset requested',
      intro: `<p>Tap the button below to set a new password. If you didn't request this, ignore this email — your password stays unchanged.</p>`,
      ctaText: 'Reset password', ctaPath: d.link || '/forgot-password'
    })
  },
  WALLET_FUNDING_SUCCESS: {
    pref: 'walletAlerts',
    make: (d, name) => ({
      subject: 'Lemak Connect — Wallet Funding Successful',
      title: 'Wallet funded successfully 💰',
      intro: `<p>Hi <b>${esc(name || 'there')}</b>, your wallet has been credited.</p>`,
      rows: [['Amount added', money(d.amount)], ['Transaction ID', esc(d.transactionId)], ['Reference', esc(d.reference)], ['Status', esc(d.status)], ['New wallet balance', `<b>${money(d.balance)}</b>`], ['Date', when(d.date)]],
      ctaText: 'View wallet', ctaPath: '/app/wallet'
    })
  },
  WALLET_FUNDING_FAILED: {
    pref: 'walletAlerts',
    make: (d, name) => ({
      subject: 'Lemak Connect — Wallet Funding Failed',
      title: 'Wallet funding failed',
      intro: `<p>Hi <b>${esc(name || 'there')}</b>, we could not complete your wallet funding. Your wallet has not been charged by Lemak Connect.</p>`,
      rows: [['Amount', money(d.amount)], ['Transaction ID', esc(d.transactionId)], ['Status', esc(d.status)], ['Reason', esc(d.reason || 'The payment was not completed.')]],
      ctaText: 'Try again', ctaPath: '/app/wallet'
    })
  },
  TRANSACTION_PENDING: {
    pref: 'transactionAlerts',
    make: (d, name) => ({
      subject: 'Lemak Connect — Transaction Pending',
      title: 'Transaction in progress',
      intro: `<p>Hi <b>${esc(name || 'there')}</b>, your transaction is being processed. We'll email you as soon as it completes.</p>`,
      rows: txRows(d), ctaText: 'View transaction', ctaPath: '/app/transactions'
    })
  },
  TRANSACTION_SUCCESS: {
    pref: 'transactionAlerts',
    make: (d, name) => ({
      subject: 'Lemak Connect — Transaction Successful',
      title: 'Transaction successful ✅',
      intro: `<p>Hi <b>${esc(name || 'there')}</b>, your transaction was completed successfully.</p>`,
      rows: [...txRows(d), ['Recipient', esc(d.recipient)], ['Provider reference', esc(d.providerReference)]],
      ctaText: 'View transaction', ctaPath: '/app/transactions'
    })
  },
  TRANSACTION_FAILED: {
    pref: 'transactionAlerts',
    make: (d, name) => ({
      subject: 'Lemak Connect — Transaction Failed',
      title: 'Transaction failed',
      intro: `<p>Hi <b>${esc(name || 'there')}</b>, we could not complete your transaction.</p>`,
      rows: [...txRows(d), ['Reason', esc(d.reason || 'The service could not process this request.')], ['Refund', esc(d.refundStatus || '')]],
      ctaText: 'View transaction', ctaPath: '/app/transactions'
    })
  },
  TRANSACTION_REFUNDED: {
    pref: 'transactionAlerts',
    make: (d, name) => ({
      subject: 'Lemak Connect — Transaction Refunded',
      title: 'Refund processed',
      intro: `<p>Hi <b>${esc(name || 'there')}</b>, a refund has been credited to your wallet.</p>`,
      rows: [...txRows(d), ['Refund amount', money(d.refundAmount || d.amount)]],
      ctaText: 'View wallet', ctaPath: '/app/wallet'
    })
  },
  TRANSACTION_REVERSED: {
    pref: 'transactionAlerts',
    make: (d, name) => ({
      subject: 'Lemak Connect — Transaction Reversed',
      title: 'Transaction reversed',
      intro: `<p>Hi <b>${esc(name || 'there')}</b>, your transaction has been reversed and the amount returned to your wallet.</p>`,
      rows: txRows(d), ctaText: 'View wallet', ctaPath: '/app/wallet'
    })
  },
  OTP_NUMBER_PURCHASED: {
    pref: 'virtualNumberAlerts',
    make: (d, name) => ({
      subject: 'Your virtual number is ready',
      title: 'Virtual number purchased',
      intro: `<p>Hi <b>${esc(name || 'there')}</b>, your request is live. Open your private order screen to view the number — your verification message will appear there automatically.</p>`,
      rows: [['Service', esc(d.service)], ['Country', esc(d.country || '—')], ['Transaction ID', esc(d.transactionId)], ['Status', esc(d.status)]],
      ctaText: 'Open order screen', ctaPath: '/app/virtual-numbers'
    })
  },
  OTP_RECEIVED: {
    pref: 'virtualNumberAlerts',
    make: (d, name) => ({
      subject: 'New verification message received',
      title: 'Your verification message is here 🔑',
      intro: `<p>Hi <b>${esc(name || 'there')}</b>, a verification message was received for your virtual number request.</p>
        <p><b>For your security, the code is only shown inside your private order screen</b> — this email intentionally does not contain it.</p>`,
      rows: [['Service', esc(d.service)], ['Transaction ID', esc(d.transactionId)]],
      ctaText: 'Open order screen', ctaPath: '/app/virtual-numbers'
    })
  },
  OTP_EXPIRED: {
    pref: 'virtualNumberAlerts',
    make: (d, name) => ({
      subject: 'Your number request expired',
      title: 'Request expired',
      intro: `<p>Hi <b>${esc(name || 'there')}</b>, no verification message was received within the allowed time, so your request expired.</p>`,
      rows: [['Service', esc(d.service)], ['Transaction ID', esc(d.transactionId)]],
      ctaText: 'View virtual numbers', ctaPath: '/app/virtual-numbers'
    })
  },
  OTP_CANCELLED: {
    pref: 'virtualNumberAlerts',
    make: (d, name) => ({
      subject: 'Your number request was cancelled',
      title: 'Request cancelled',
      intro: `<p>Hi <b>${esc(name || 'there')}</b>, your virtual number request was cancelled as requested.</p>`,
      rows: [['Service', esc(d.service)], ['Transaction ID', esc(d.transactionId)]],
      ctaText: 'View virtual numbers', ctaPath: '/app/virtual-numbers'
    })
  },
  OTP_REFUNDED: {
    pref: 'virtualNumberAlerts',
    make: (d, name) => ({
      subject: 'Refund processed — virtual number',
      title: 'Refund processed 💸',
      intro: `<p>Hi <b>${esc(name || 'there')}</b>, ${d.expired ? 'no verification message was received within the allowed time and ' : ''}your eligible refund has been processed to your wallet.</p>`,
      rows: [['Service', esc(d.service)], ['Refund amount', money(d.refundAmount)], ['Transaction ID', esc(d.transactionId)], ['Refund status', esc(d.refundStatus || 'REFUNDED')]],
      ctaText: 'View wallet', ctaPath: '/app/wallet'
    })
  },
  SMM_ORDER_CREATED: {
    pref: 'smmAlerts',
    make: (d, name) => ({
      subject: 'Lemak Connect — Social Growth Order Received',
      title: 'Order received 🚀',
      intro: `<p>Hi <b>${esc(name || 'there')}</b>, we received your social growth order.</p>`,
      rows: [...txRows(d), ['Link', esc(d.link)]], ctaText: 'View order', ctaPath: '/app/transactions'
    })
  },
  SMM_ORDER_PROCESSING: {
    pref: 'smmAlerts',
    make: (d, name) => ({
      subject: 'Lemak Connect — Social Growth Order Processing',
      title: 'Order processing ⏳',
      intro: `<p>Hi <b>${esc(name || 'there')}</b>, your social growth order is being processed by the provider.</p>`,
      rows: txRows(d), ctaText: 'View order', ctaPath: '/app/transactions'
    })
  },
  SMM_ORDER_COMPLETED: {
    pref: 'smmAlerts',
    make: (d, name) => ({
      subject: 'Lemak Connect — Social Growth Order Completed',
      title: 'Order completed 🎉',
      intro: `<p>Hi <b>${esc(name || 'there')}</b>, your social growth order has been completed.</p>`,
      rows: txRows(d), ctaText: 'View order', ctaPath: '/app/transactions'
    })
  },
  SMM_ORDER_FAILED: {
    pref: 'smmAlerts',
    make: (d, name) => ({
      subject: 'Lemak Connect — Social Growth Order Failed',
      title: 'Order failed',
      intro: `<p>Hi <b>${esc(name || 'there')}</b>, we could not complete your social growth order.</p>`,
      rows: [...txRows(d), ['Reason', esc(d.reason || '')], ['Refund', esc(d.refundStatus || '')]],
      ctaText: 'View order', ctaPath: '/app/transactions'
    })
  },
  MARKETPLACE_ORDER_PAID: {
    pref: 'marketplaceAlerts',
    make: (d, name) => ({
      subject: 'Lemak Connect — Order Paid',
      title: 'Payment confirmed 🛒',
      intro: `<p>Hi <b>${esc(name || 'there')}</b>, your marketplace order is paid and in progress. A private chat with the seller is now open.</p>`,
      rows: [['Order', esc(d.listingTitle)], ['Amount', money(d.amount)], ['Transaction ID', esc(d.transactionId)], ['Status', esc(d.status)]],
      ctaText: 'Open order chat', ctaPath: '/app/marketplace'
    })
  },
  MARKETPLACE_SELLER_DELIVERY: {
    pref: 'marketplaceAlerts',
    make: (d, name) => ({
      subject: 'Lemak Connect — Delivery Submitted',
      title: 'Seller delivered your order 📦',
      intro: `<p>Hi <b>${esc(name || 'there')}</b>, the seller submitted your delivery. Review it in the order chat, then confirm once you're satisfied.</p>`,
      rows: [['Order', esc(d.listingTitle)], ['Transaction ID', esc(d.transactionId)], ['Status', esc(d.status)]],
      ctaText: 'Review delivery', ctaPath: '/app/marketplace'
    })
  },
  MARKETPLACE_ORDER_COMPLETED: {
    pref: 'marketplaceAlerts',
    make: (d, name) => ({
      subject: 'Lemak Connect — Order Completed',
      title: 'Order completed ✅',
      intro: `<p>Hi <b>${esc(name || 'there')}</b>, your marketplace order is fully completed.</p>`,
      rows: [['Order', esc(d.listingTitle)], ['Transaction ID', esc(d.transactionId)], ['Status', esc(d.status)]],
      ctaText: 'View orders', ctaPath: '/app/marketplace'
    })
  },
  MARKETPLACE_REFUNDED: {
    pref: 'marketplaceAlerts',
    make: (d, name) => ({
      subject: 'Lemak Connect — Marketplace Refund',
      title: 'Refund processed 💸',
      intro: `<p>Hi <b>${esc(name || 'there')}</b>, your marketplace refund has been credited to your wallet.</p>`,
      rows: [['Order', esc(d.listingTitle)], ['Refund amount', money(d.refundAmount)], ['Transaction ID', esc(d.transactionId)], ['Refund status', esc(d.refundStatus || 'REFUNDED')]],
      ctaText: 'View wallet', ctaPath: '/app/wallet'
    })
  },
  MARKETPLACE_SELLER_APPROVED: {
    pref: 'marketplaceAlerts',
    make: (d) => ({
      subject: 'Lemak Connect — Seller Application Approved',
      title: 'You are now an approved seller 🎉',
      intro: `<p>Congratulations <b>${esc(d.name || 'there')}</b>! Your seller application has been approved. You can now create listings and receive orders.</p>`,
      ctaText: 'Start selling', ctaPath: '/app/marketplace'
    })
  },
  MARKETPLACE_SELLER_REJECTED: {
    pref: 'marketplaceAlerts',
    make: (d) => ({
      subject: 'Lemak Connect — Seller Application Update',
      title: 'Seller application update',
      intro: `<p>Hi <b>${esc(d.name || 'there')}</b>, after review we could not approve your seller application at this time.</p>`,
      rows: [['Reason', esc(d.reason || '')]],
      ctaText: 'Contact support', ctaPath: '/app/support'
    })
  },
  MARKETPLACE_LISTING_APPROVED: {
    pref: 'marketplaceAlerts',
    make: (d) => ({
      subject: 'Lemak Connect — Listing Approved',
      title: 'Listing approved 🎉',
      intro: `<p>Your listing <b>${esc(d.title)}</b> is now live in the marketplace.</p>`,
      ctaText: 'View listing', ctaPath: '/app/marketplace'
    })
  },
  MARKETPLACE_LISTING_REJECTED: {
    pref: 'marketplaceAlerts',
    make: (d) => ({
      subject: 'Lemak Connect — Listing Update',
      title: 'Listing update',
      intro: `<p>Your listing <b>${esc(d.title)}</b> could not be published at this time.</p>`,
      rows: [['Reason', esc(d.reason || '')]],
      ctaText: 'Contact support', ctaPath: '/app/support'
    })
  },
  SECURITY_ALERT: {
    pref: null,
    make: (d, name) => ({
      subject: 'Lemak Connect — Security Alert',
      title: 'Security alert on your account',
      intro: `<p>Hi <b>${esc(name || 'there')}</b>,</p><p>${esc(d.message || 'We noticed unusual activity on your account.')}</p>
        <p>If this wasn't you, contact support immediately.</p>`,
      ctaText: 'Review settings', ctaPath: '/app/settings'
    })
  },
  PASSWORD_CHANGED: {
    pref: null,
    make: (d, name) => ({
      subject: 'Lemak Connect — Password Changed',
      title: 'Your password was changed',
      intro: `<p>Hi <b>${esc(name || 'there')}</b>, your password was changed successfully. If this wasn't you, contact support immediately.</p>`,
      ctaText: 'Open the app', ctaPath: '/login'
    })
  },
  EMAIL_CHANGED: {
    pref: null,
    make: (d, name) => ({
      subject: 'Lemak Connect — Email Changed',
      title: 'Your email was changed',
      intro: `<p>Hi <b>${esc(name || 'there')}</b>, the email address on your account was changed. If this wasn't you, contact support immediately.</p>`,
      ctaText: 'Open the app', ctaPath: '/login'
    })
  },
  ACCOUNT_SUSPENDED: {
    pref: null,
    make: (d, name) => ({
      subject: 'Lemak Connect — Account Suspended',
      title: 'Account suspended',
      intro: `<p>Hi <b>${esc(name || 'there')}</b>, your account has been suspended.</p><p>${esc(d.reason || 'Contact support for more information.')}</p>`,
      ctaText: 'Contact support', ctaPath: '/support'
    })
  },
  ACCOUNT_REACTIVATED: {
    pref: null,
    make: (d, name) => ({
      subject: 'Lemak Connect — Account Reactivated',
      title: 'Account reactivated ✅',
      intro: `<p>Hi <b>${esc(name || 'there')}</b>, your account has been reactivated. Welcome back!</p>`,
      ctaText: 'Open the app', ctaPath: '/app'
    })
  },
  SUPPORT_MESSAGE: {
    pref: 'systemAlerts',
    make: (d, name) => ({
      subject: 'Lemak Connect — New Support Message',
      title: 'New support message',
      intro: `<p>Hi <b>${esc(name || 'there')}</b>, you have a new message from our support team.</p>`,
      rows: [['Message', esc(d.message)]],
      ctaText: 'Open support', ctaPath: '/app/support'
    })
  },
  ADMIN_NOTIFICATION: {
    pref: null,
    make: (d) => ({
      subject: 'Lemak Connect — Admin Notification',
      title: esc(d.title || 'Admin notification'),
      intro: `<p>${esc(d.message || '')}</p>`,
      ctaText: 'Open admin', ctaPath: '/admin'
    })
  },
  TEST: {
    pref: null,
    make: (d, name) => ({
      subject: 'Lemak Connect — Test Email',
      title: 'Test email ✉️',
      intro: `<p>Hi <b>${esc(name || 'Admin')}</b>, this is a test email from your Lemak Connect email system. If you can read this, transactional email is working correctly.</p>`,
      ctaText: 'Open Lemak Connect', ctaPath: '/app'
    })
  }
};

// Send a transactional email. Never throws — a failed email must never fail
// a successful transaction. Logs every attempt to EmailLog.
export async function sendTransactionalEmail(service, opts) {
  const { emailType, userId, recipientEmail, recipientName, transactionId, data = {}, force } = opts;
  const to = String(recipientEmail || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return { ok: false, skipped: 'invalid_recipient' };
  const template = TEMPLATES[emailType];
  if (!template) return { ok: false, skipped: 'unknown_type' };

  // User email preferences — security emails are always mandatory.
  if (userId && template.pref && !force) {
    try {
      const prefs = await service.entities.NotificationPreference.filter({ userId }, '-created_date', 1);
      const p = prefs && prefs[0];
      if (p && p.emailEnabled === false) return { ok: false, skipped: 'emails_disabled' };
      if (p && p[template.pref] === false) return { ok: false, skipped: 'disabled_by_user' };
    } catch (e) { /* prefer sending */ }
  }

  // Duplicate protection: same event to the same recipient never sends twice.
  const idempotencyKey = `${emailType}:${transactionId || 'no-tx'}:${to}`;
  let log = null;
  try {
    const existing = await service.entities.EmailLog.filter({ idempotencyKey, status: 'sent' }, '-created_date', 1);
    if (existing && existing[0]) return { ok: true, duplicated: true };
  } catch (e) { /* EmailLog unavailable — still send */ }

  const { subject, ...body } = template.make(data, recipientName);
  const html = brandEmail(body);

  try {
    log = await service.entities.EmailLog.create({
      userId: userId || null, recipientEmail: to, emailType, subject,
      transactionId: transactionId || null, status: 'queued', idempotencyKey
    });
  } catch (e) { /* logging is best-effort */ }

  try {
    const resendKey = secrets.get('RESEND_API_KEY');
    if (!resendKey) {
      const safeError = 'Email provider not configured (RESEND_API_KEY missing)';
      if (log) await service.entities.EmailLog.update(log.id, { status: 'failed', safeErrorMessage: safeError }).catch(() => {});
      return { ok: false, error: 'not_configured' };
    }
    const from = secrets.get('RESEND_FROM_EMAIL') || 'Lemak Connect <onboarding@resend.dev>';
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject, html })
    });
    const payload = await res.json().catch(() => null);
    if (res.ok && payload && payload.id) {
      if (log) await service.entities.EmailLog.update(log.id, { status: 'sent', resendMessageId: String(payload.id), sentAt: new Date().toISOString() }).catch(() => {});
      return { ok: true, messageId: payload.id };
    }
    const safeError = (payload && payload.message) ? String(payload.message).slice(0, 200) : `Resend error (HTTP ${res.status})`;
    if (log) await service.entities.EmailLog.update(log.id, { status: 'failed', errorCode: String(res.status), safeErrorMessage: safeError }).catch(() => {});
    return { ok: false, error: safeError };
  } catch (e) {
    const safeError = String((e && e.message) || 'Email send failed').slice(0, 200);
    if (log) await service.entities.EmailLog.update(log.id, { status: 'failed', safeErrorMessage: safeError }).catch(() => {});
    return { ok: false, error: safeError };
  }
}

// Admin email system status. Never returns secret values.
export async function getEmailSystemStatus(service) {
  let configured = false;
  try { configured = Boolean(secrets.get('RESEND_API_KEY')); } catch (e) {}
  let sender = 'Lemak Connect <onboarding@resend.dev>';
  try {
    const from = secrets.get('RESEND_FROM_EMAIL');
    if (from) sender = from;
  } catch (e) {}
  let lastSent = null;
  let lastError = null;
  try {
    const sent = await service.entities.EmailLog.filter({ status: 'sent' }, '-created_date', 1);
    if (sent && sent[0]) lastSent = { at: sent[0].sentAt || sent[0].created_date, emailType: sent[0].emailType, recipientEmail: sent[0].recipientEmail };
    const failed = await service.entities.EmailLog.filter({ status: 'failed' }, '-created_date', 1);
    if (failed && failed[0]) lastError = { at: failed[0].created_date, emailType: failed[0].emailType, message: failed[0].safeErrorMessage };
  } catch (e) {}
  return {
    provider: 'Resend',
    configured,
    sender,
    status: configured ? 'operational' : 'not_configured',
    lastSent,
    lastError
  };
}
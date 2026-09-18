import { secrets } from 'base44:runtime';

// ---------- Centralized transactional SMS system (Termii) ----------
// Server-side only — the TERMII_API_KEY never leaves this runtime, is never
// returned to callers and never logged. Every send is recorded in SmsLog and
// deduplicated on (smsType + transactionId + phone). Never throws: a failed
// SMS must never fail a successful transaction.

const money = (n) => `NGN ${Number(n || 0).toLocaleString()}`;

// Template registry. pref = the NotificationPreference flag consulted before
// sending (same flags the email system uses); null means always send.
export const SMS_TEMPLATES = {
  WALLET_FUNDING_SUCCESS: {
    pref: 'walletAlerts',
    make: (d) => {
      const balance = (d.balance === null || d.balance === undefined) ? '' : ` New balance: ${money(d.balance)}.`;
      return `Wallet funded! ${money(d.amount)} added to your Lemak Connect wallet.${balance} Ref: ${d.transactionId}. - Lemak Connect`;
    }
  },
  TRANSACTION_SUCCESS: {
    pref: 'transactionAlerts',
    make: (d) => {
      const to = d.recipient ? ` to ${d.recipient}` : '';
      return `Success! ${d.service} for ${money(d.amount)}${to} is complete. Ref: ${d.transactionId}. - Lemak Connect`;
    }
  }
};

export async function sendTransactionalSms(service, opts) {
  const { smsType, userId, phone, transactionId, data = {}, force } = opts;
  const template = SMS_TEMPLATES[smsType];
  if (!template) return { ok: false, skipped: 'unknown_type' };
  if (!userId) return { ok: false, skipped: 'no_user' };

  // Recipient: explicit phone, else the customer's profile phone.
  let to = String(phone || '').replace(/[\s-]/g, '');
  if (!to) {
    try {
      const profiles = await service.entities.UserProfile.filter({ userId }, '-created_date', 1);
      to = String((profiles && profiles[0] && profiles[0].phone) || '').replace(/[\s-]/g, '');
    } catch (e) {
      return { ok: false, skipped: 'profile_unavailable' };
    }
  }
  if (!/^0\d{10}$/.test(to) && !/^\+?\d{10,15}$/.test(to)) return { ok: false, skipped: 'invalid_recipient' };

  // User alert preferences — same flags the email system consults.
  if (template.pref && !force) {
    try {
      const prefs = await service.entities.NotificationPreference.filter({ userId }, '-created_date', 1);
      const p = prefs && prefs[0];
      if (p && p[template.pref] === false) return { ok: false, skipped: 'disabled_by_user' };
    } catch (e) { /* prefer sending */ }
  }

  // Duplicate protection: the same event to the same phone never sends twice.
  const idempotencyKey = `${smsType}:${transactionId || 'no-tx'}:${to}`;
  let log = null;
  try {
    const existing = await service.entities.SmsLog.filter({ idempotencyKey, status: 'sent' }, '-created_date', 1);
    if (existing && existing[0]) return { ok: true, duplicated: true };
  } catch (e) { /* SmsLog unavailable — still send */ }

  const text = template.make(data);
  try {
    log = await service.entities.SmsLog.create({
      userId: userId || null, recipientPhone: to, smsType,
      message: text.slice(0, 480), transactionId: transactionId || null,
      status: 'queued', idempotencyKey
    });
  } catch (e) { /* logging is best-effort */ }

  try {
    const apiKey = secrets.get('TERMII_API_KEY');
    if (!apiKey) {
      const safeError = 'SMS provider not configured (TERMII_API_KEY missing)';
      if (log) await service.entities.SmsLog.update(log.id, { status: 'failed', safeErrorMessage: safeError }).catch(() => {});
      return { ok: false, error: 'not_configured' };
    }
    const senderId = String(secrets.get('TERMII_SENDER_ID') || 'Lemak').slice(0, 11);
    const res = await fetch('https://api.ng.termii.com/api/sms/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, from: senderId, sms: text, type: 'plain', channel: 'generic', api_key: apiKey })
    });
    const payload = await res.json().catch(() => null);
    const messageId = payload && (payload.message_id || payload.messageId);
    if (res.ok && messageId) {
      if (log) await service.entities.SmsLog.update(log.id, { status: 'sent', termiiMessageId: String(messageId), sentAt: new Date().toISOString() }).catch(() => {});
      return { ok: true, messageId };
    }
    const safeError = (payload && payload.message) ? String(payload.message).slice(0, 200) : `Termii error (HTTP ${res.status})`;
    if (log) await service.entities.SmsLog.update(log.id, { status: 'failed', errorCode: String(res.status), safeErrorMessage: safeError }).catch(() => {});
    return { ok: false, error: safeError };
  } catch (e) {
    const safeError = String((e && e.message) || 'SMS send failed').slice(0, 200);
    if (log) await service.entities.SmsLog.update(log.id, { status: 'failed', safeErrorMessage: safeError }).catch(() => {});
    return { ok: false, error: safeError };
  }
}

// Admin SMS system status. Never returns secret values.
export async function getSmsSystemStatus(service) {
  let configured = false;
  try { configured = Boolean(secrets.get('TERMII_API_KEY')); } catch (e) {}
  let lastSent = null;
  let lastError = null;
  try {
    const sent = await service.entities.SmsLog.filter({ status: 'sent' }, '-created_date', 1);
    if (sent && sent[0]) lastSent = { at: sent[0].sentAt || sent[0].created_date, smsType: sent[0].smsType, recipientPhone: sent[0].recipientPhone };
    const failed = await service.entities.SmsLog.filter({ status: 'failed' }, '-created_date', 1);
    if (failed && failed[0]) lastError = { at: failed[0].created_date, smsType: failed[0].smsType, message: failed[0].safeErrorMessage };
  } catch (e) {}
  return {
    provider: 'Termii',
    configured,
    status: configured ? 'operational' : 'not_configured',
    lastSent,
    lastError
  };
}
// Server-side transaction PIN security. The PIN itself is never stored or
// returned in readable form — only a per-user salted SHA-256 hash.

export const PIN_MIN_LENGTH = 4;
export const PIN_MAX_LENGTH = 6;
export const PIN_MAX_ATTEMPTS = 5;
export const PIN_LOCK_MINUTES = 15;

export function isValidPin(pin) {
  const p = String(pin || '');
  const re = new RegExp('^\\d{' + PIN_MIN_LENGTH + ',' + PIN_MAX_LENGTH + '}$');
  return re.test(p);
}

export function randomHex(byteLen = 16) {
  const bytes = new Uint8Array(byteLen);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

export async function hashPin(pin, salt) {
  const data = new TextEncoder().encode(String(salt) + ':' + String(pin));
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}

export async function getPinCredential(service, userId) {
  const rows = await service.entities.TransactionPin.filter({ userId }, '-created_date', 5);
  return rows && rows[0] ? rows[0] : null;
}

export async function logSecurityEvent(service, userId, eventType, opts = {}) {
  try {
    await service.entities.SecurityEvent.create({
      userId,
      eventType,
      severity: opts.severity || 'info',
      description: opts.description || eventType.replace(/_/g, ' '),
      metadata: opts.metadata || null
    });
  } catch (e) { /* non-fatal */ }
}

function pinError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

// Verify a transaction PIN with rate limiting and temporary lockout.
// Throws an error carrying statusCode on wrong or locked attempts.
export async function verifyPin(service, userId, pin, opts = {}) {
  const credential = await getPinCredential(service, userId);
  if (!credential) throw pinError('No transaction PIN is set', 404);

  let lockedUntil = credential.lockedUntil ? new Date(credential.lockedUntil) : null;
  let attempts = Number(credential.failedAttempts) || 0;

  // An expired lock resets the failure counter
  if (lockedUntil && lockedUntil <= new Date()) {
    lockedUntil = null;
    attempts = 0;
    await service.entities.TransactionPin.update(credential.id, { failedAttempts: 0, lockedUntil: null });
  }
  if (lockedUntil) {
    throw pinError('Too many incorrect attempts. Try again at ' +
      lockedUntil.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' }) + '.', 429);
  }

  const hash = await hashPin(pin, credential.salt);
  if (hash === credential.pinHash) {
    if (attempts > 0) {
      await service.entities.TransactionPin.update(credential.id, { failedAttempts: 0 });
    }
    return credential;
  }

  attempts += 1;
  if (attempts >= PIN_MAX_ATTEMPTS) {
    const lockUntil = new Date(Date.now() + PIN_LOCK_MINUTES * 60 * 1000).toISOString();
    await service.entities.TransactionPin.update(credential.id, { failedAttempts: attempts, lockedUntil: lockUntil });
    await logSecurityEvent(service, userId, 'pin_locked', {
      severity: 'warning',
      description: 'Transaction PIN locked after ' + attempts + ' failed attempts'
    });
    throw pinError('Too many incorrect attempts. Your PIN is locked for ' + PIN_LOCK_MINUTES + ' minutes.', 429);
  }

  await service.entities.TransactionPin.update(credential.id, { failedAttempts: attempts });
  await logSecurityEvent(service, userId, 'pin_failed', {
    severity: 'warning',
    description: 'Incorrect transaction PIN (' + (PIN_MAX_ATTEMPTS - attempts) + ' attempts remaining)',
    metadata: { context: opts.context || null }
  });
  throw pinError('Incorrect PIN. ' + (PIN_MAX_ATTEMPTS - attempts) +
    (PIN_MAX_ATTEMPTS - attempts === 1 ? ' attempt' : ' attempts') + ' remaining.', 401);
}

// Purchase gate: passes when no PIN exists or purchase protection is off.
export async function assertPinForPurchase(service, userId, pin) {
  const credential = await getPinCredential(service, userId);
  if (!credential || !credential.requireForPurchases) return;
  if (!pin) {
    throw pinError('Enter your transaction PIN to complete this purchase', 403);
  }
  await verifyPin(service, userId, pin, { context: 'purchase' });
}
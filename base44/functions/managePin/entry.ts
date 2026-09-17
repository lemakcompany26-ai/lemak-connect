import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { hashPin, randomHex, isValidPin, getPinCredential, verifyPin, logSecurityEvent } from '../../shared/security.ts';

// Transaction PIN management. The PIN never leaves the server in readable
// form — only a salted hash is stored, and no endpoint ever returns it.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const service = base44.asServiceRole;

    const body = await req.json();
    const action = String(body.action || '');
    const credential = await getPinCredential(service, user.id);

    if (action === 'status') {
      return Response.json({
        hasPin: !!credential,
        requireForPurchases: !!(credential && credential.requireForPurchases),
        locked: !!(credential && credential.lockedUntil && new Date(credential.lockedUntil) > new Date()),
        lockedUntil: (credential && credential.lockedUntil) || null
      });
    }

    if (action === 'setup') {
      if (credential) return Response.json({ error: 'You already have a PIN. Use Change PIN instead.' }, { status: 409 });
      if (!isValidPin(body.pin)) return Response.json({ error: 'PIN must be 4-6 digits' }, { status: 400 });
      const salt = randomHex(16);
      await service.entities.TransactionPin.create({
        userId: user.id,
        pinHash: await hashPin(body.pin, salt),
        salt,
        failedAttempts: 0,
        requireForPurchases: false,
        lastChangedAt: new Date().toISOString()
      });
      await logSecurityEvent(service, user.id, 'pin_created', { severity: 'info', description: 'Transaction PIN created' });
      return Response.json({ ok: true });
    }

    if (action === 'change') {
      if (!credential) return Response.json({ error: 'You do not have a PIN yet.' }, { status: 404 });
      if (!isValidPin(body.newPin)) return Response.json({ error: 'New PIN must be 4-6 digits' }, { status: 400 });
      try {
        await verifyPin(service, user.id, body.currentPin, { context: 'change' });
      } catch (e) {
        return Response.json({ error: e.message }, { status: e.statusCode || 401 });
      }
      const salt = randomHex(16);
      await service.entities.TransactionPin.update(credential.id, {
        pinHash: await hashPin(body.newPin, salt),
        salt,
        failedAttempts: 0,
        lockedUntil: null,
        lastChangedAt: new Date().toISOString()
      });
      await logSecurityEvent(service, user.id, 'pin_changed', { severity: 'info', description: 'Transaction PIN changed' });
      return Response.json({ ok: true });
    }

    if (action === 'reset') {
      if (!credential) return Response.json({ error: 'You do not have a PIN yet.' }, { status: 404 });
      if (!isValidPin(body.newPin)) return Response.json({ error: 'New PIN must be 4-6 digits' }, { status: 400 });
      const salt = randomHex(16);
      await service.entities.TransactionPin.update(credential.id, {
        pinHash: await hashPin(body.newPin, salt),
        salt,
        failedAttempts: 0,
        lockedUntil: null,
        lastChangedAt: new Date().toISOString()
      });
      await logSecurityEvent(service, user.id, 'pin_reset', {
        severity: 'warning',
        description: 'Transaction PIN reset from a logged-in session'
      });
      return Response.json({ ok: true });
    }

    if (action === 'verify') {
      try {
        await verifyPin(service, user.id, body.pin, { context: 'manual' });
        return Response.json({ ok: true });
      } catch (e) {
        return Response.json({ ok: false, error: e.message }, { status: e.statusCode || 401 });
      }
    }

    if (action === 'setRequirePurchases') {
      if (!credential) return Response.json({ error: 'Create a PIN first.' }, { status: 404 });
      const enabled = !!body.enabled;
      await service.entities.TransactionPin.update(credential.id, { requireForPurchases: enabled });
      await logSecurityEvent(service, user.id, enabled ? 'pin_require_purchases_enabled' : 'pin_require_purchases_disabled', {
        severity: 'info',
        description: 'Require PIN for purchases ' + (enabled ? 'enabled' : 'disabled')
      });
      return Response.json({ ok: true });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
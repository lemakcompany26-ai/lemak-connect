import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse
} from 'npm:@simplewebauthn/server@13.1.0';
import { logSecurityEvent, randomHex, hashPin } from '../../shared/security.ts';

// Biometric (fingerprint / Face ID) unlock. Registration and unlock
// ceremonies are fully verified server-side — the browser only relays
// signed authenticator responses. A successful unlock returns a short-lived
// one-time approval token that purchase functions accept instead of the PIN.
const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const APPROVAL_TTL_MS = 5 * 60 * 1000;

function toBase64url(value) {
  if (typeof value === 'string') return value;
  const bytes = new Uint8Array(value);
  let str = '';
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const service = base44.asServiceRole;

    const url = new URL(req.url);
    const rpID = url.hostname;
    const origin = url.origin;

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || '');

    const creds = await service.entities.BiometricCredential.filter({ userId: user.id }, '-created_date', 5);
    const credential = creds && creds[0] ? creds[0] : null;

    if (action === 'status') {
      return Response.json({
        registered: !!credential,
        deviceLabel: credential ? credential.deviceLabel : null,
        lastUsedAt: credential ? credential.lastUsedAt : null
      });
    }

    if (action === 'register_begin') {
      if (credential) return Response.json({ error: 'This device is already registered' }, { status: 409 });
      const options = await generateRegistrationOptions({
        rpName: 'Lemak Connect',
        rpID,
        userName: user.email || user.id,
        userDisplayName: user.full_name || 'Lemak Connect user',
        attestationType: 'none',
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          residentKey: 'preferred',
          userVerification: 'required'
        }
      });
      await service.entities.BiometricChallenge.deleteMany({ userId: user.id, type: 'register' });
      await service.entities.BiometricChallenge.create({
        userId: user.id, type: 'register', value: options.challenge,
        expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS).toISOString()
      });
      return Response.json({ options });
    }

    if (action === 'register_complete') {
      if (credential) return Response.json({ error: 'This device is already registered' }, { status: 409 });
      const challenges = await service.entities.BiometricChallenge.filter({ userId: user.id, type: 'register' }, '-created_date', 1);
      const stored = challenges && challenges[0] ? challenges[0] : null;
      if (!stored) return Response.json({ error: 'Registration session expired. Try again.' }, { status: 400 });
      await service.entities.BiometricChallenge.deleteMany({ userId: user.id, type: 'register' });
      if (new Date(stored.expiresAt) <= new Date()) {
        return Response.json({ error: 'Registration session expired. Try again.' }, { status: 400 });
      }

      let verification;
      try {
        verification = await verifyRegistrationResponse({
          response: body.credential,
          expectedChallenge: stored.value,
          expectedOrigin: origin,
          expectedRPID: rpID
        });
      } catch (e) {
        await logSecurityEvent(service, user.id, 'biometric_failed', {
          severity: 'warning', description: 'Biometric registration failed: ' + e.message
        });
        return Response.json({ error: 'Device could not be verified. Try again.' }, { status: 400 });
      }
      if (!verification || !verification.verified || !verification.registrationInfo) {
        await logSecurityEvent(service, user.id, 'biometric_failed', {
          severity: 'warning', description: 'Biometric registration rejected'
        });
        return Response.json({ error: 'Device could not be verified. Try again.' }, { status: 400 });
      }

      const info = verification.registrationInfo;
      await service.entities.BiometricCredential.create({
        userId: user.id,
        credentialId: info.credential.id,
        publicKey: toBase64url(info.credential.publicKey),
        counter: info.credential.counter || 0,
        deviceLabel: String(body.deviceLabel || 'This device'),
        transports: info.credential.transports || [],
        lastUsedAt: new Date().toISOString()
      });
      await logSecurityEvent(service, user.id, 'biometric_registered', {
        severity: 'info', description: 'Biometric unlock registered for this device'
      });
      return Response.json({ ok: true });
    }

    if (action === 'assert_begin') {
      if (!credential) return Response.json({ error: 'No biometric is registered yet' }, { status: 404 });
      const options = await generateAuthenticationOptions({
        rpID,
        userVerification: 'required',
        allowCredentials: [{ id: credential.credentialId }]
      });
      await service.entities.BiometricChallenge.deleteMany({ userId: user.id, type: 'assert' });
      await service.entities.BiometricChallenge.create({
        userId: user.id, type: 'assert', value: options.challenge,
        expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS).toISOString()
      });
      return Response.json({ options });
    }

    if (action === 'assert_complete') {
      if (!credential) return Response.json({ error: 'No biometric is registered yet' }, { status: 404 });
      const challenges = await service.entities.BiometricChallenge.filter({ userId: user.id, type: 'assert' }, '-created_date', 1);
      const stored = challenges && challenges[0] ? challenges[0] : null;
      if (!stored) return Response.json({ error: 'Unlock session expired. Try again.' }, { status: 400 });
      await service.entities.BiometricChallenge.deleteMany({ userId: user.id, type: 'assert' });
      if (new Date(stored.expiresAt) <= new Date()) {
        return Response.json({ error: 'Unlock session expired. Try again.' }, { status: 400 });
      }

      let verification;
      try {
        verification = await verifyAuthenticationResponse({
          response: body.credential,
          expectedChallenge: stored.value,
          expectedOrigin: origin,
          expectedRPID: rpID,
          credential: {
            id: credential.credentialId,
            publicKey: credential.publicKey,
            counter: credential.counter || 0,
            transports: credential.transports || []
          }
        });
      } catch (e) {
        await logSecurityEvent(service, user.id, 'biometric_failed', {
          severity: 'warning', description: 'Biometric unlock failed: ' + e.message
        });
        return Response.json({ error: 'Unlock could not be verified. Try again.' }, { status: 401 });
      }
      if (!verification || !verification.verified) {
        await logSecurityEvent(service, user.id, 'biometric_failed', {
          severity: 'warning', description: 'Biometric unlock rejected'
        });
        return Response.json({ error: 'Unlock could not be verified. Try again.' }, { status: 401 });
      }

      const token = randomHex(32);
      const salt = randomHex(16);
      await service.entities.BiometricChallenge.create({
        userId: user.id, type: 'approval',
        value: await hashPin(token, salt), salt,
        expiresAt: new Date(Date.now() + APPROVAL_TTL_MS).toISOString()
      });
      await service.entities.BiometricCredential.update(credential.id, {
        counter: verification.authenticationInfo.newCounter,
        lastUsedAt: new Date().toISOString()
      });
      await logSecurityEvent(service, user.id, 'biometric_verified', {
        severity: 'info', description: 'Biometric unlock verified'
      });
      return Response.json({ approvalToken: token });
    }

    if (action === 'remove') {
      if (!credential) return Response.json({ error: 'No biometric is registered yet' }, { status: 404 });
      await service.entities.BiometricCredential.delete(credential.id);
      await service.entities.BiometricChallenge.deleteMany({ userId: user.id });
      await logSecurityEvent(service, user.id, 'biometric_removed', {
        severity: 'warning', description: 'Biometric unlock removed for this device'
      });
      return Response.json({ ok: true });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
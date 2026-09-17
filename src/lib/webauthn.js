import { base44 } from '@/api/base44Client';

// Browser-side WebAuthn helpers. All cryptographic verification happens
// server-side (manageBiometric); these only encode/relay authenticator data.

export function biometricSupported() {
  return typeof window !== 'undefined' && !!window.PublicKeyCredential;
}

export async function platformAuthenticatorAvailable() {
  if (!biometricSupported()) return false;
  try {
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch (e) {
    return false;
  }
}

function base64urlToUint8Array(base64url) {
  const base64 = String(base64url).replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob(padded);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function bufferToBase64url(buffer) {
  const bytes = new Uint8Array(buffer);
  let str = '';
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

// Register this device's fingerprint / Face ID. Returns a JSON-serializable
// credential the server verifies before storing anything.
export async function createPlatformCredential(options) {
  const publicKey = {
    ...options,
    challenge: base64urlToUint8Array(options.challenge),
    user: { ...options.user, id: base64urlToUint8Array(options.user.id) },
    excludeCredentials: (options.excludeCredentials || []).map(c => ({ ...c, id: base64urlToUint8Array(c.id) }))
  };
  const credential = await navigator.credentials.create({ publicKey });
  return {
    id: credential.id,
    rawId: credential.id,
    type: credential.type,
    response: {
      clientDataJSON: bufferToBase64url(credential.response.clientDataJSON),
      attestationObject: bufferToBase64url(credential.response.attestationObject)
    }
  };
}

// Run the full unlock ceremony and return a short-lived, one-time server
// approval token that purchases accept instead of the transaction PIN.
export async function requestBiometricApproval() {
  const beginRes = await base44.functions.invoke('manageBiometric', { action: 'assert_begin' });
  const begin = beginRes.data || beginRes;
  if (!begin.options) throw new Error(begin.error || 'Could not start biometric unlock');

  const publicKey = {
    challenge: base64urlToUint8Array(begin.options.challenge),
    rpId: begin.options.rpId,
    userVerification: begin.options.userVerification || 'required',
    allowCredentials: (begin.options.allowCredentials || []).map(c => ({ ...c, id: base64urlToUint8Array(c.id) }))
  };
  const assertion = await navigator.credentials.get({ publicKey });
  const credential = {
    id: assertion.id,
    rawId: assertion.id,
    type: assertion.type,
    response: {
      clientDataJSON: bufferToBase64url(assertion.response.clientDataJSON),
      authenticatorData: bufferToBase64url(assertion.response.authenticatorData),
      signature: bufferToBase64url(assertion.response.signature),
      userHandle: assertion.response.userHandle ? bufferToBase64url(assertion.response.userHandle) : null
    }
  };

  const completeRes = await base44.functions.invoke('manageBiometric', { action: 'assert_complete', credential });
  const complete = completeRes.data || completeRes;
  if (!complete.approvalToken) throw new Error(complete.error || 'Unlock failed');
  return complete.approvalToken;
}
import { base44, isBase44Down } from './base44Client';
import { supabase } from './supabaseClient';

export async function getUser() {
  if (!isBase44Down && base44?.auth) {
    try { return await base44.auth.me(); } catch {}
  }
  if (supabase) {
    const { data } = await supabase.auth.getUser();
    return data?.user || null;
  }
  return null;
}

export async function loginWithOTP(email) {
  // Uses Supabase Email OTP - transactional email you set
  const { error } = await supabase.auth.signInWithOtp({ email });
  if (error) throw error;
  return true;
}

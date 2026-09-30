import { supabase } from './supabaseClient'

// Call this instead of base44 sendEmail - it auto handles credit = 0
export async function sendOTPEmail(email, otp) {
  try {
    // 1. Try Base44 first (if credit available)
    const { base44 } = await import('./base44Client')
    if (base44?.functions?.invoke) {
      return await base44.functions.invoke('sendEmail', { email, otp })
    }
  } catch (e) {
    console.log('Base44 down (402), switching to Supabase...', e.message)
  }

  // 2. Fallback to Supabase + Resend (works when Base44 has no credit)
  const { data, error } = await supabase.functions.invoke('send-email', {
    body: { to: email, otp: otp, subject: `LEMAK CONNECT OTP: ${otp}` }
  })
  if (error) throw error
  return data
}

// Same for transactional emails (receipts, etc)
export async function sendTransactional(to, subject, html) {
  const { data, error } = await supabase.functions.invoke('send-email', {
    body: { to, subject, html }
  })
  if (error) throw error
  return data
}

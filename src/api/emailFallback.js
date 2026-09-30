import { supabase } from './supabaseClient'

// 1. OTP EMAIL - Uses RESEND_API_KEY via send_email_hook_secret
export async function sendOTPEmail(email, otp) {
  try {
    // Try Base44 first (if credit available)
    const { base44 } = await import('./base44Client')
    if (base44?.functions?.invoke) {
      return await base44.functions.invoke('sendEmail', {
        to: email, otp: otp, type: 'otp'
      })
    }
  } catch (e) {
    console.log('Base44 down (402), switching to Supabase + Resend', e.message)
  }

  // 2. Fallback to Supabase + Resend (works always, same RESEND_API_KEY)
  const { data, error } = await supabase.functions.invoke('send_email_hook_secret', {
    body: { 
      to: email, 
      otp: otp, 
      subject: `LEMAK CONNECT OTP: ${otp}`,
      html: `<div style="font-family:sans-serif;padding:24px;border:1px solid #ddd;border-radius:12px"><h2 style="color:#0a7a2f">LEMAK CONNECT</h2><h1 style="letter-spacing:10px;background:#f0fdf4;padding:16px;text-align:center">${otp}</h1><p>Your OTP code - via Supabase + Resend</p></div>`
    }
  })

  if (error) throw error
  return data
}

// 2. TRANSACTIONAL EMAILS (receipts, notifications) - Same RESEND_API_KEY
export async function sendTransactional(to, subject, htmlContent) {
  try {
    const { base44 } = await import('./base44Client')
    if (base44?.functions?.invoke) {
      return await base44.functions.invoke('sendEmail', { to, subject, html: htmlContent })
    }
  } catch (e) {
    console.log('Base44 down, using Resend fallback')
  }

  const { data, error } = await supabase.functions.invoke('send_email_hook_secret', {
    body: { to, subject, html: htmlContent }
  })
  
  if (error) throw error
  return data
}

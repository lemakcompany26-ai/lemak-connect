import { createClient } from '@supabase/supabase-js'

// Supabase backend - YOUR WORKING BACKEND (884422 success)
const SUPABASE_URL = "https://bhgkvyfordvbdzyzmhwz.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoZ2t2eWZvcmR2YmR6eXptaHd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4NjMyMjAsImV4cCI6MjEwNDQzOTIyMH0.6EvZAiKeFuV6A54AnAJBRD2dsQKaAFVwPCXjkK8UI34"

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// MAIN FUNCTION - USE THIS EVERYWHERE
export async function sendEmail({ to, subject, html, otp, type = 'transactional' }) {
  console.log(`[LEMAK EMAIL] Sending ${type} to ${to}`)
  
  // 1. Try Base44 first (if credit available)
  try {
    const module = await import('./base44Client').catch(() => null)
    if (module?.base44?.functions?.invoke) {
      const res = await module.base44.functions.invoke('sendEmail', { 
        to, subject, html, otp, type 
      })
      console.log("Sent via Base44")
      return { success: true, provider: 'base44', data: res }
    }
  } catch (err) {
    console.warn("Base44 402 credit exhausted, using Supabase fallback:", err.message)
  }

  // 2. Fallback - Supabase + Resend - YOUR WORKING 884422 BACKEND
  const { data, error } = await supabase.functions.invoke('send_email_hook_secret', {
    body: { to, subject, html, otp, type }
  })

  if (error) {
    console.error("Supabase email error:", error)
    throw error
  }

  console.log(`Email sent via Supabase + RESEND_API_KEY to ${to}`)
  return { success: true, provider: 'supabase_resend', data }
}

// Shortcut functions
export const sendOTP = (email, otp) => sendEmail({
  to: email,
  otp: otp,
  type: 'otp',
  subject: `LEMAK CONNECT OTP: ${otp}`,
  html: `<div style="font-family:sans-serif;max-width:480px;margin:auto;border:1px solid #ddd;border-radius:16px;padding:24px"><h2 style="color:#0a7a2f">LEMAK CONNECT</h2><h1 style="letter-spacing:10px;background:#f0fdf4;padding:16px;text-align:center;border-radius:8px">${otp}</h1><p>Code valid 10 min</p></div>`
})

export const sendReceipt = (email, order) => sendEmail({
  to: email,
  type: 'transactional',
  subject: `LEMAK Receipt #${order.id} - ₦${order.total}`,
  html: `<div style="font-family:sans-serif;max-width:500px;margin:auto;border:1px solid #ddd;border-radius:16px;padding:24px"><h2 style="color:#0a7a2f">Order Confirmed</h2><p>Order #${order.id}</p><p>Amount: ₦${order.total}</p><p>Thank you for shopping LEMAK CONNECT!</p></div>`
})

export const sendVerification = (email, otp) => sendOTP(email, otp)

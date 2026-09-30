import { sendEmail, sendReceipt, sendOTP } from '@/lib/emailService'
import { useState } from 'react'

export default function TestEmail() {
  const [loading, setLoading] = useState(false)
  
  const test = async () => {
    setLoading(true)
    try {
      const res = await sendEmail({
        to: "lemakcompany26@gmail.com",
        subject: "LEMAK CONNECT - Transactional TEST",
        html: `<h2>Transactional Works! ✅</h2><p>Frontend connected to Supabase backend</p><p>Same RESEND_API_KEY as OTP 884422</p>`,
        type: 'transactional'
      })
      alert("Sent! Check lemakcompany26@gmail.com - " + JSON.stringify(res))
    } catch(e) {
      alert("Error: " + e.message)
    }
    setLoading(false)
  }

  return (
    <button onClick={test} disabled={loading} style={{padding:'12px 24px', background:'#0a7a2f', color:'white', borderRadius:'8px'}}>
      {loading ? "Sending..." : "Test Transactional Email"}
    </button>
  )
}

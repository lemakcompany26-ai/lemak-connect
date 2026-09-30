import { useState } from 'react'

export default function TestEmail() {
  const [loading, setLoading] = useState(false)

  const send = async () => {
    setLoading(true)
    try {
      const res = await fetch("https://bhgkvyfordvbdzyzmhwz.supabase.co/functions/v1/send_email_hook_secret", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoZ2t2eWZvcmR2YmR6eXptaHd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4NjMyMjAsImV4cCI6MjEwNDQzOTIyMH0.6EvZAiKeFuV6A54AnAJBRD2dsQKaAFVwPCXjkK8UI34"
        },
        body: JSON.stringify({
          to: "lemakcompany26@gmail.com",
          subject: "LEMAK Transactional LIVE ✅",
          html: "<h2>LEMAK CONNECT</h2><p>Frontend -> Supabase -> Resend works! Same key as OTP 884422</p><p>Order #12345 - N50,000 Paid</p>"
        })
      })
      const data = await res.json()
      alert(data.success ? "SENT! Check Gmail" : JSON.stringify(data))
    } catch (e) {
      alert("Error: " + e.message)
    }
    setLoading(false)
  }

  return (
    <button onClick={send} disabled={loading} style={{ padding: '12px 20px', background: '#0a7a2f', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>
      {loading ? "..." : "Test Transactional Email"}
    </button>
  )
}

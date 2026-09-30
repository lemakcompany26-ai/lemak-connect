import { useEffect, useState } from 'react'
import { base44 } from '@/api/base44Client'

export default function PromoCodesPage() {
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState([])
  const [promo, setPromo] = useState({ code: 'BABAALADO1', min_funding: 5000, active: true, benefit: 'INSTANT_SIGNUP' })

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Get all users who used promo
      const res = await base44.functions.invoke('getAllUsers', { promo: 'BABAALADO1' }).catch(()=>null)
      // Fallback: get from entities if you use base44.entities
      let data = res?.data || res
      if (data?.users) setUsers(data.users)

      // Get promo config
      const promoRes = await base44.functions.invoke('getPromoCodes', {}).catch(()=>null)
      if (promoRes?.data?.find(p=>p.code==='BABAALADO1')) {
        setPromo(promoRes.data.find(p=>p.code==='BABAALADO1'))
      }
    } catch(e){ console.log(e) }
    setLoading(false)
  }

  const togglePromo = async () => {
    const newStatus =!promo.active
    setPromo({...promo, active: newStatus})
    await base44.functions.invoke('updatePromoCode', { code: 'BABAALADO1', active: newStatus })
    alert(`BABAALADO1 is now ${newStatus? 'ACTIVE ✅' : 'DISABLED ❌'}`)
  }

  if (loading) return <div className="p-8">Loading...</div>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Promo Codes</h1>

      {/* BABAALADO1 Card */}
      <div className="bg-secondary text-white p-6 rounded-2xl border border-white/10">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              {promo.code} {promo.active? '✅' : '❌'}
            </h2>
            <p className="text-white/60 text-sm mt-1">Min Funding: ₦{promo.min_funding} → Instant Signup</p>
            <p className="text-white/40 text-xs mt-2 max-w-md">
              Logic: User enters BABAALADO1 at signup → Funds wallet ₦5000 → Backend sets is_approved = true automatically. No admin approval needed.
            </p>
            <div className="mt-3 bg-white/10 rounded-lg p-3 text-xs font-mono">
              Code: BABAALADO1 | Benefit: INSTANT_SIGNUP | Auto-approve on ₦5000
            </div>
          </div>
          <button onClick={togglePromo} className={`px-5 py-2.5 rounded-xl font-bold ${promo.active? 'bg-red-500' : 'bg-green-600'} text-white`}>
            {promo.active? 'Disable' : 'Enable'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border p-4">
        <h3 className="font-bold mb-3">Users who used BABAALADO1 ({users.length})</h3>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-gray-500 border-b"><th className="p-2">Email</th><th className="p-2">Balance</th><th className="p-2">Status</th></tr></thead>
            <tbody>
              {users.map(u=>(
                <tr key={u.id} className="border-b"><td className="p-2">{u.email}</td><td className="p-2">₦{u.wallet_balance || 0}</td><td className="p-2">{u.is_approved? '✅ Approved' : '⏳ Pending'}</td></tr>
              ))}
            </tbody>
          </table>
          {users.length===0 && <p className="text-center text-gray-400 py-8">No users yet. When someone signs up with BABAALADO1 and funds 5000, they appear here.</p>}
        </div>
      </div>

      {/* How to wire funding */}
      <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-sm">
        <b>To make auto-approve work on funding:</b> In your wallet funding success function, add:<br/>
        <code className="bg-black text-white p-2 rounded block mt-2 text-xs">
          if (localStorage.getItem('applied_promo') === 'BABAALADO1' && newBalance >= 5000) &#123;<br/>
          &nbsp;&nbsp;await base44.functions.invoke('approveUserInstant', &#123; userId &#125;);<br/>
          &#125;
        </code>
      </div>
    </div>
  )
        }

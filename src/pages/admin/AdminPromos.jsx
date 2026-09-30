import { useEffect, useState } from 'react'
import { base44 } from '@/api/base44Client'

export default function PromoCodesPage() {
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState([])
  const [promo, setPromo] = useState({ code: 'BABAALADO1', min_funding: 5000, active: true })

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await base44.functions.invoke('getAllUsers', {}).catch(()=>null)
      const data = res?.data || res
      if (data?.users) {
        const filtered = data.users.filter(u => u.promo_used === 'BABAALADO1' || u.promo === 'BABAALADO1')
        setUsers(filtered)
      }
    } catch(e){ console.log(e) }
    setLoading(false)
  }

  const togglePromo = async () => {
    const newStatus = !promo.active
    setPromo({...promo, active: newStatus})
    try {
      await base44.functions.invoke('updatePromoCode', { code: 'BABAALADO1', active: newStatus })
    } catch {}
    alert(`BABAALADO1 is now ${newStatus ? 'ACTIVE' : 'DISABLED'}`)
  }

  if (loading) return <div className="p-8">Loading...</div>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Promo Codes</h1>

      <div className="bg-secondary text-white p-6 rounded-2xl border border-white/10">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold">{promo.code} {promo.active ? 'ACTIVE' : 'OFF'}</h2>
            <p className="text-white/60 text-sm mt-1">Min Funding: N{promo.min_funding} - Instant Signup</p>
            <p className="text-white/40 text-xs mt-2 max-w-md">
              User enters BABAALADO1 at signup, funds 5000, gets auto-approved.
            </p>
          </div>
          <button onClick={togglePromo} className={`px-5 py-2.5 rounded-xl font-bold ${promo.active ? 'bg-red-500' : 'bg-green-600'} text-white`}>
            {promo.active ? 'Disable' : 'Enable'}
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
                <tr key={u.id} className="border-b"><td className="p-2">{u.email}</td><td className="p-2">N{u.wallet_balance || 0}</td><td className="p-2">{u.is_approved ? 'Approved' : 'Pending'}</td></tr>
              ))}
            </tbody>
          </table>
          {users.length===0 && <p className="text-center text-gray-400 py-8">No users yet.</p>}
        </div>
      </div>
    </div>
  )
              }

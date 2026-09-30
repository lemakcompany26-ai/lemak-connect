import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function PromoManager() {
  const [promos, setPromos] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  // Default promo
  const defaultPromos = [
    { code: "BABAALADO1", min_funding: 5000, benefit: "INSTANT_SIGNUP", active: true, used_count: 0 },
  ]

  useEffect(() => {
    fetchPromos()
  }, [])

  const fetchPromos = async () => {
    setLoading(true)
    // Try fetch from DB, if not exist use default
    const { data: promoData } = await supabase.from('promo_codes').select('*')
    if (promoData && promoData.length > 0) {
      setPromos(promoData)
    } else {
      setPromos(defaultPromos)
      // Create table data if first time
      await supabase.from('promo_codes').upsert(defaultPromos, { onConflict: 'code' })
    }

    // Fetch users who used BABAALADO1
    const { data: usersData } = await supabase
      .from('profiles')
      .select('id, email, full_name, wallet_balance, promo_used, is_approved, created_at')
      .eq('promo_used', 'BABAALADO1')
      .order('created_at', { ascending: false })

    if (usersData) setUsers(usersData)
    setLoading(false)
  }

  const togglePromo = async (code, active) => {
    await supabase.from('promo_codes').update({ active: !active }).eq('code', code)
    setPromos(promos.map(p => p.code === code ? { ...p, active: !active } : p))
  }

  const approveUserInstant = async (userId) => {
    await supabase.from('profiles').update({ 
      is_approved: true, 
      status: 'active',
      approved_at: new Date().toISOString()
    }).eq('id', userId)
    alert("Approved instantly!")
    fetchPromos()
  }

  if (loading) return <div className="p-6">Loading promos...</div>

  return (
    <div className="p-6 bg-white rounded-xl shadow">
      <h2 className="text-2xl font-bold mb-4">🎟️ Promo Code Manager</h2>
      
      {promos.map(promo => (
        <div key={promo.code} className="border p-4 rounded-lg mb-6 bg-gray-50">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-lg">{promo.code} {promo.active ? "✅ ACTIVE" : "❌ OFF"}</h3>
              <p className="text-sm text-gray-600">Min Funding: ₦{promo.min_funding} → {promo.benefit}</p>
              <p className="text-xs mt-1">Logic: User funds ≥ ₦5000 → is_approved = true (no manual approval)</p>
            </div>
            <button
              onClick={() => togglePromo(promo.code, promo.active)}
              className={`px-4 py-2 rounded font-bold ${promo.active ? 'bg-red-500 text-white' : 'bg-green-600 text-white'}`}
            >
              {promo.active ? 'Disable' : 'Enable'}
            </button>
          </div>
        </div>
      ))}

      <h3 className="font-bold mt-6 mb-2">Users who used BABAALADO1 ({users.length})</h3>
      <div className="overflow-auto">
        <table className="w-full text-sm border">
          <thead className="bg-black text-white">
            <tr>
              <th className="p-2 text-left">Email</th>
              <th className="p-2">Balance</th>
              <th className="p-2">Approved</th>
              <th className="p-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b">
                <td className="p-2">{u.email}<br/><span className="text-xs text-gray-500">{u.full_name}</span></td>
                <td className="p-2 text-center">₦{u.wallet_balance}</td>
                <td className="p-2 text-center">{u.is_approved ? '✅' : '⏳'}</td>
                <td className="p-2 text-center">
                  {!u.is_approved && (
                    <button onClick={() => approveUserInstant(u.id)} className="bg-green-600 text-white px-3 py-1 rounded text-xs">
                      Instant Approve
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && <p className="p-4 text-gray-400 text-center">No users yet with BABAALADO1</p>}
      </div>
    </div>
  )
                }

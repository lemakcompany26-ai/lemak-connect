import { useEffect, useState } from 'react'
import { base44 } from '@/api/base44Client'

export default function PromoCodesPage() {
  const [promos, setPromos] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    code: 'BABAALADO1',
    min_funding: 5000,
    benefit: 'INSTANT_SIGNUP',
    max_uses: 100000,
    discount_percent: 0,
    start_date: new Date().toISOString().slice(0,10),
    end_date: new Date(Date.now() + 30*86400000).toISOString().slice(0,10),
    active: true
  })

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const res = await base44.functions.invoke('getPromoCodes', {}).catch(()=>null)
      const data = res?.data || res || []
      if (Array.isArray(data) && data.length > 0) {
        setPromos(data.map(p=>({
         ...p,
          // FIX DATES: ensure local date display
          start_date: p.start_date? new Date(p.start_date).toISOString().slice(0,10) : new Date().toISOString().slice(0,10),
          end_date: p.end_date? new Date(p.end_date).toISOString().slice(0,10) : new Date(Date.now()+30*86400000).toISOString().slice(0,10)
        })))
      } else {
        setPromos([form])
      }
    } catch {}
    setLoading(false)
  }

  const createPromo = async (e) => {
    e.preventDefault()
    if (!form.code) return alert('Code required')
    const payload = {
     ...form,
      code: form.code.toUpperCase().trim(),
      start_date: new Date(form.start_date).toISOString(),
      end_date: new Date(form.end_date + 'T23:59:59').toISOString(),
      created_at: new Date().toISOString()
    }
    try {
      await base44.functions.invoke('createPromoCode', payload)
      // Also save to entities if you have it
      await base44.entities?.PromoCode?.create?.(payload).catch(()=>null)
      setPromos([payload,...promos.filter(p=>p.code!==payload.code)])
      alert(`Created ${payload.code} LIVE!`)
      setForm({...form, code: ''})
    } catch(err) {
      // Fallback local
      setPromos([payload,...promos.filter(p=>p.code!==payload.code)])
      alert(`Created ${payload.code} (local)`)
    }
  }

  const toggle = async (code) => {
    const updated = promos.map(p=> p.code===code? {...p, active:!p.active} : p)
    setPromos(updated)
    await base44.functions.invoke('updatePromoCode', { code, active:!updated.find(p=>p.code===code).active? false : true }).catch(()=>null)
  }

  const remove = async (code) => {
    if (!confirm(`Delete ${code}?`)) return
    setPromos(promos.filter(p=>p.code!==code))
    await base44.functions.invoke('deletePromoCode', { code }).catch(()=>null)
  }

  if (loading) return <div className="p-8">Loading promos...</div>

  return (
    <div className="space-y-6 max-w-6xl">
      <h1 className="text-2xl font-bold">Promo Codes Manager - LIVE</h1>

      {/* CREATE FORM */}
      <form onSubmit={createPromo} className="bg-white border rounded-2xl p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div><label className="text-xs">CODE</label><input value={form.code} onChange={e=>setForm({...form, code: e.target.value.toUpperCase()})} className="w-full border rounded-lg px-3 h-10 font-bold" placeholder="BABAALADO100K" required /></div>
        <div><label className="text-xs">Min Funding ₦</label><input type="number" value={form.min_funding} onChange={e=>setForm({...form, min_funding: parseInt(e.target.value)})} className="w-full border rounded-lg px-3 h-10" /></div>
        <div><label className="text-xs">Max Uses</label><input type="number" value={form.max_uses} onChange={e=>setForm({...form, max_uses: parseInt(e.target.value)})} className="w-full border rounded-lg px-3 h-10" /></div>
        <div><label className="text-xs">Benefit</label><select value={form.benefit} onChange={e=>setForm({...form, benefit: e.target.value})} className="w-full border rounded-lg px-3 h-10"><option>INSTANT_SIGNUP</option><option>DISCOUNT</option><option>BONUS_CREDIT</option></select></div>
        <div><label className="text-xs">Start Date</label><input type="date" value={form.start_date} onChange={e=>setForm({...form, start_date: e.target.value})} className="w-full border rounded-lg px-3 h-10" /></div>
        <div><label className="text-xs">End Date</label><input type="date" value={form.end_date} onChange={e=>setForm({...form, end_date: e.target.value})} className="w-full border rounded-lg px-3 h-10" /></div>
        <div className="col-span-2 flex items-end"><button className="w-full bg-black text-white h-10 rounded-xl font-bold">+ Create Promo LIVE</button></div>
      </form>

      {/* LIST */}
      <div className="bg-white border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-black text-white"><tr><th className="p-3 text-left">Code</th><th className="p-3">Dates</th><th className="p-3">Funding</th><th className="p-3">Status</th><th className="p-3">Action</th></tr></thead>
          <tbody>
            {promos.map(p=>(
              <tr key={p.code} className="border-b">
                <td className="p-3 font-bold">{p.code}<br/><span className="text-xs text-gray-500">{p.benefit}</span></td>
                <td className="p-3 text-xs">{p.start_date} → {p.end_date}<br/>{new Date(p.end_date) < new Date()? '❌ Expired' : '✅ Live'}</td>
                <td className="p-3">₦{p.min_funding}<br/>Max: {p.max_uses}</td>
                <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs ${p.active? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{p.active? 'ACTIVE' : 'OFF'}</span></td>
                <td className="p-3 flex gap-2"><button onClick={()=>toggle(p.code)} className="px-3 py-1 bg-gray-900 text-white rounded-lg text-xs">{p.active? 'Disable' : 'Enable'}</button><button onClick={()=>remove(p.code)} className="px-3 py-1 bg-red-50 text-red-600 rounded-lg text-xs">Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
      }

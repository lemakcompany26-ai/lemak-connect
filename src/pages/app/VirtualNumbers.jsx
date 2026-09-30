import { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

const SOCIAL = ['whatsapp','telegram','facebook','instagram','tiktok','twitter','x','google','youtube','snapchat','discord','linkedin','reddit'];

export default function VirtualNumbers(){
  const [servers,setServers]=useState([]);
  const [selected,setSelected]=useState('a');
  const [country,setCountry]=useState('US');
  const [catalog,setCatalog]=useState(null);
  const [loading,setLoading]=useState(true);

  const load = useCallback(async()=>{
    setLoading(true);
    try{
      const r = await base44.functions.invoke('virtualNumbers',{action:'provider_catalog'});
      const d = r.data || r;
      const all = d.servers || [];
      setServers(all);
      const active = all.find(s=>s.id===selected) || all[0];
      if(active){ setCatalog(active); if(active.id==='a') setCountry('US'); }
    }catch(e){ console.log(e); }
    setLoading(false);
  },[selected]);

  useEffect(()=>{ load(); },[load]);

  if(loading) return <div className="p-10 text-center text-zinc-400">Loading live numbers...</div>;

  return (
    <div className="p-4 space-y-4 pb-20">
      <h1 className="text-white text-xl font-bold">Virtual Numbers LIVE</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {servers.map(s=>{
          return (
            <button key={s.id} onClick={()=>{
              setSelected(s.id);
              setCatalog(s);
              if(s.id==='a') setCountry('US');
              else setCountry((s.countries && s.countries[0] && s.countries[0].code) || 'NG');
            }} className={"p-4 rounded-2xl border text-left "+(selected===s.id?"border-amber-400 bg-amber-400/10":"border-zinc-700 bg-zinc-800")}>
              <div className="text-white font-bold text-sm">Server {s.id==='a'?'1 - Fleexa (US Only)':'2 - SmsPool (All Countries)'}</div>
              <div className="text-xs text-zinc-400 mt-1">{s.online? (s.smsStock+" live services - "+(s.countries? s.countries.length:0)+" countries") : "offline"}</div>
            </button>
          )
        })}
      </div>

      {catalog && (
        <div className="space-y-3">
          <div className="text-xs text-zinc-500 uppercase">Countries {selected==='a'?'(US Only)':'(All)'}</div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {(catalog.countries||[]).map(c=>{
              return <button key={c.code} onClick={()=>setCountry(c.code)} className={"shrink-0 px-3 py-1.5 rounded-full text-xs font-bold "+(country===c.code?"bg-blue-600 text-white":"bg-zinc-800 text-zinc-300")}>{c.code}</button>
            })}
          </div>

          <div className="text-xs text-zinc-500">Showing {catalog.smsServices?catalog.smsServices.length:0} services - OTP enters in chat</div>

          <div className="grid gap-2">
            {(catalog.smsServices||[]).slice(0,60).map(s=>{
              return (
                <div key={s.id} className="bg-zinc-800 border border-zinc-700 p-3 rounded-xl flex justify-between items-center">
                  <div>
                    <div className="text-white text-sm font-bold">{s.id}</div>
                    <div className="text-[11px] text-zinc-400">Available: {s.available!==null && s.available!==undefined? s.available : 'on demand'} - OTP in chat</div>
                  </div>
                  <div className="text-amber-400 text-xs">Buy</div>
                </div>
              )
            })}
          </div>

          <div className="text-xs text-zinc-500 mt-4 uppercase">Rent a Number (1-12 months)</div>
          <div className="grid gap-2">
            {(catalog.rentServices||SOCIAL).slice(0,20).map(id=>{
              return <div key={id} className="bg-zinc-800 border border-zinc-700 p-3 rounded-xl flex justify-between"><span className="text-white text-sm">{id} - Rental</span><span className="text-xs text-zinc-400">1-12 mo</span></div>
            })}
          </div>
        </div>
      )}
    </div>
  );
}

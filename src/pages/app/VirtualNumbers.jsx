import { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { formatNaira } from '@/lib/format';

const SOCIAL = ['whatsapp','telegram','facebook','instagram','tiktok','twitter','x','google','youtube','snapchat','discord'];

export default function VirtualNumbers(){
  const [servers,setServers]=useState([]);
  const [selectedServer,setSelectedServer]=useState(null);
  const [country,setCountry]=useState('US');
  const [catalog,setCatalog]=useState(null);
  const [tab,setTab]=useState('sms');
  const [prices,setPrices]=useState({});
  const [loading,setLoading]=useState(true);

  const load = useCallback(async()=>{
    setLoading(true);
    try{
      const r = await base44.functions.invoke('virtualNumbers',{action:'provider_catalog'});
      const d = r.data || r;
      setServers(d.servers || []);
    }catch(e){ console.log('catalog error',e); }
    setLoading(false);
  },[]);

  useEffect(()=>{ load(); },[load]);

  const selectServer = (s)=>{
    setSelectedServer(s.id);
    setCatalog(s);
    if(s.id==='a'){ setCountry('US'); setTab('sms'); }
    else { setCountry(''); setTab('sms'); }
    setPrices({});
    if(s.smsServices && s.smsServices.length){
      s.smsServices.slice(0,20).forEach(async(item)=>{
        try{
          const res = await base44.functions.invoke('virtualNumbers',{action:'quote',serverId:s.id,country:s.id==='a'?'US':(country||'NG'),services:[item.id]});
          const p = (res.data||res).prices || {};
          setPrices(prev=>({...prev,...p}));
        }catch{}
      });
    }
  };

  const selectCountry = async(code)=>{
    setCountry(code);
    setPrices({});
    if(!catalog) return;
    for(let i=0;i<Math.min(20,catalog.smsServices.length);i++){
      const item = catalog.smsServices[i];
      try{
        const res = await base44.functions.invoke('virtualNumbers',{action:'quote',serverId:catalog.id,country:code,services:[item.id]});
        const p = (res.data||res).prices || {};
        setPrices(prev=>({...prev,...p}));
      }catch{}
    }
  };

  if(loading) return <div className="p-10 text-center text-zinc-400">Loading servers...</div>;

  if(!selectedServer){
    return (
      <div className="p-4 space-y-4">
        <h1 className="text-white text-xl font-bold">Choose Server To Start</h1>
        <p className="text-xs text-zinc-400">You must select Server 1 or Server 2 before you see live numbers.</p>
        <div className="grid gap-3">
          {servers.map(s=>{
            return (
              <button key={s.id} onClick={()=>selectServer(s)} className={"p-5 rounded-2xl border text-left "+(s.online?"border-zinc-700 bg-zinc-800 hover:border-amber-400":"border-red-900/50 bg-zinc-900 opacity-50")}>
                <div className="text-white font-bold">{s.id==='a'?'Server 1 - Fleexa (US Only)':'Server 2 - SmsPool (All Countries)'}</div>
                <div className="text-xs text-zinc-400 mt-1">{s.online? s.smsStock+" live services - "+(s.countries?s.countries.length:0)+" countries":"Offline - check API keys"}</div>
                <div className="mt-2 text-xs text-amber-400 font-bold">Tap to select →</div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4 pb-20">
      <div className="flex justify-between items-center">
        <button onClick={()=>{ setSelectedServer(null); setCatalog(null); }} className="text-xs text-zinc-400 border border-zinc-700 px-3 py-1 rounded-full">← Change Server</button>
        <div className="text-xs text-white font-bold">{selectedServer==='a'?'Server 1 US Only':'Server 2 All Countries'} - {country||'Select country'}</div>
      </div>

      {selectedServer==='a' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <button onClick={()=>setTab('sms')} className={"px-4 py-2 rounded-full text-xs font-bold "+(tab==='sms'?"bg-amber-400 text-black":"bg-zinc-800 text-zinc-300")}>SMS OTP</button>
            <button onClick={()=>setTab('email')} className={"px-4 py-2 rounded-full text-xs font-bold "+(tab==='email'?"bg-amber-400 text-black":"bg-zinc-800 text-zinc-300")}>Email OTP</button>
            <button onClick={()=>setTab('rent')} className={"px-4 py-2 rounded-full text-xs font-bold "+(tab==='rent'?"bg-amber-400 text-black":"bg-zinc-800 text-zinc-300")}>Rentals 1-12 mo</button>
          </div>
          {tab==='sms' && (
            <div className="space-y-2">
              {(catalog?.smsServices||SOCIAL.map(id=>({id,available:100}))).map(item=>{
                const p = prices[item.id];
                return (
                  <div key={item.id} className="bg-zinc-800 border border-zinc-700 p-3 rounded-xl flex justify-between items-center">
                    <div><div className="text-white text-sm font-bold">{item.id}</div><div className="text-[11px] text-zinc-400">Available: {item.available||'on demand'}</div></div>
                    <div className="text-right"><div className="text-amber-400 text-xs font-bold">{p? (p.customerPrice? formatNaira(p.customerPrice):'Not available'):'Loading price...'}</div><button className="mt-1 text-[10px] bg-white text-black px-2 py-1 rounded-full">Buy Now</button></div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {selectedServer==='b' && (
        <div className="space-y-3">
          {!country && (
            <div className="space-y-2">
              <div className="text-sm text-white font-bold">Select Country to see live numbers</div>
              <div className="grid grid-cols-2 gap-2">
                {(catalog?.countries||[{code:'NG',name:'Nigeria'},{code:'US',name:'USA'}]).map(c=>{
                  return <button key={c.code} onClick={()=>selectCountry(c.code)} className="bg-zinc-800 border border-zinc-700 p-3 rounded-xl text-left"><div className="text-white text-sm">{c.code}</div><div className="text-xs text-zinc-400">{c.name}</div></button>
                })}
              </div>
            </div>
          )}
          {country && (
            <div className="space-y-2">
              <div className="flex justify-between"><div className="text-xs text-zinc-400">Live numbers for {country}</div><button onClick={()=>setCountry('')} className="text-xs text-amber-400">Change country</button></div>
              {(catalog?.smsServices||[]).slice(0,50).map(item=>{
                const p = prices[item.id];
                return (
                  <div key={item.id} className="bg-zinc-800 border border-zinc-700 p-3 rounded-xl flex justify-between">
                    <div><div className="text-white text-sm font-bold">{item.id}</div><div className="text-[11px] text-zinc-400">{country} - Live</div></div>
                    <div className="text-amber-400 text-xs">{p?.customerPrice? formatNaira(p.customerPrice):'...'}</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
       }

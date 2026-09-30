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
    // fetch prices for this server
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

  // STEP 1 - MUST SELECT SERVER 1 or SERVER 2 BEFORE PROCEED
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
          {servers.length===0 && <div className="text-zinc-500 text-sm">No servers configured. Check OTP_PROVIDER_API_URL and OTP_SERVER_B_URL in Base44 secrets.</div>}
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

      {/* SERVER 1 FLOW: Email / SMS / Rentals + Social */}
      {selectedServer==='a' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <button onClick={()=>setTab('sms')} className={"px-4 py-2 rounded-full text-xs font-bold "+(tab==='sms'?"bg-amber-400 text-black":"bg-zinc-800 text-zinc-300")}>SMS OTP</button>
            <button onClick={()=>setTab('email')} className={"px-4 py-2 rounded-full text-xs font-bold "+(tab==='email'?"bg-amber-400 text-black":"bg-zinc-800 text-zinc-300")}>Email OTP</button>
            <button onClick={()=>setTab('rent')} className={"px-4 py-2 rounded-full text-xs font-bold "+(tab==='rent'?"bg-amber-400 text-black":"bg-zinc-800 text-zinc-300")}>Rentals 1-12 mo</button>
          </div>

          {tab==='sms' && (
            <div className="space-y-2">
              <div className="text-xs text-zinc-500">Social Media Live Numbers - OTP enters in chat - US Only</div>
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
          {tab==='email' && (
            <div className="space-y-2">
              <div className="text-xs text-zinc-500">Live Email OTP - US</div>
              {(catalog?.emailProducts?.length? catalog.emailProducts : [{id:'gmail'},{id:'yahoo'},{id:'outlook'}]).map(item=>{
                return <div key={item.id} className="bg-zinc-800 border border-zinc-700 p-3 rounded-xl"><div className="text-white text-sm">{item.id} - Email OTP</div></div>
              })}
            </div>
          )}
          {tab==='rent' && (
            <div className="space-y-2">
              <div className="text-xs text-zinc-500">Rent Virtual Numbers - 1 to 12 months - US Only</div>
              {Array.from({length:12}).map((_,i)=>{
                return <div key={i} className="bg-zinc-800 border border-zinc-700 p-3 rounded-xl flex justify-between"><span className="text-white text-sm">{i+1} Month Rental</span><span className="text-amber-400 text-xs">{catalog?.rentAreas?.[0]?.durations?.[i]?.customerPrice? formatNaira(catalog.rentAreas[0].durations[i].customerPrice):'from ₦4,500'}</span></div>
              })}
            </div>
          )}
        </div>
      )}

      {/* SERVER 2 FLOW: Must select country FIRST then live numbers */}
      {selectedServer==='b' && (
        <div className="space-y-3">
          {!country && (
            <div className="space-y-2">
              <div className="text-sm text-white font-bold">Select Country to see live numbers</div>
              <div className="grid grid-cols-2 gap-2">
                {(catalog?.countries||[{code:'NG',name:'Nigeria'},{code:'US',name:'USA'},{code:'GB',name:'UK'},{code:'CA',name:'Canada'}]).map(c=>{
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
              {(!catalog?.smsServices || catalog.smsServices.length===0) && <div className="text-zinc-500 text-sm p-4 text-center">No live numbers returned from provider. Check SmsPool API key in secrets.</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
          }

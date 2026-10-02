import { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { formatNaira } from '@/lib/format';

export default function VirtualNumbers(){
  const [servers,setServers]=useState([]);
  const [selectedServer,setSelectedServer]=useState(null);
  const [country,setCountry]=useState('US');
  const [catalog,setCatalog]=useState(null);
  const [tab,setTab]=useState('sms');
  const [prices,setPrices]=useState({});
  const [loading,setLoading]=useState(true);
  const [buying,setBuying]=useState(null);
  const [search,setSearch]=useState('');

  const load = useCallback(async()=>{
    setLoading(true);
    try{
      const r = await base44.functions.invoke('virtualNumbers',{action:'provider_catalog'});
      const d = r.data || r;
      setServers(d.servers || []);
    }catch(e){ console.log(e); }
    setLoading(false);
  },[]);

  useEffect(()=>{ load(); },[load]);

  const selectServer = async(s)=>{
    setSelectedServer(s.id);
    setCatalog(s);
    setCountry(s.id==='a'? 'US' : '');
    setPrices({});
    setSearch('');
    // pre-load prices for first 20 services
    const services = s.smsServices || [];
    for(let item of services.slice(0,15)){
      try{
        const res = await base44.functions.invoke('virtualNumbers',{
          action:'quote', serverId:s.id, country: s.id==='a'? 'US' : 'NG',
          services:[item.id], service:item.id
        });
        const p = (res.data||res).prices || {};
        setPrices(prev=>({...prev,...p}));
      }catch{}
    }
  };

  const selectCountry = async(code, name)=>{
    setCountry(code);
    setPrices({});
    if(!catalog) return;
    for(let item of (catalog.smsServices||[]).slice(0,20)){
      try{
        const res = await base44.functions.invoke('virtualNumbers',{
          action:'quote', serverId:catalog.id, country:code, countryName:name,
          services:[item.id], service:item.id
        });
        setPrices(prev=>({...prev,...(res.data||res).prices||{}}));
      }catch{}
    }
  };

  const handleBuy = async(serviceId)=>{
    if(!catalog) return;
    const price = prices[serviceId]?.customerPrice || 650;
    if(!confirm(`Buy ${serviceId} for ${country||'US'} at ${formatNaira(price)}?`)) return;
    setBuying(serviceId);
    try{
      const user = await base44.auth.me();
      const res = await base44.functions.invoke('virtualNumbers',{
        action:'order', serverId:catalog.id, country: country||'US',
        countryName: catalog.countries?.find(c=>c.code===country)?.name || country,
        service: serviceId, price, userEmail: user.email
      });
      const data = res.data || res;
      if(!data.success) throw new Error(data.error||'Order failed');
      alert(`Success! Number: ${data.phone} - Check chat for OTP`);
      // redirect to rentals/chat page
      window.location.href = '/rentals';
    }catch(e){ alert(e.message); }
    setBuying(null);
  };

  if(loading) return <div className="p-10 text-center text-zinc-400">Loading servers...</div>;

  // STEP 1 - SELECT SERVER FIRST - NO PROVIDER NAMES SHOWN
  if(!selectedServer){
    return (
      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        <h1 className="text-white text-xl font-bold">Choose Server To Start</h1>
        <p className="text-xs text-zinc-400">Select a server to see live numbers. OTP enters in chat instantly.</p>
        <div className="grid gap-3">
          {servers.map(s=>(
            <button key={s.id} onClick={()=>selectServer(s)} className={`p-5 rounded-2xl border text-left transition ${s.online?"border-zinc-700 bg-zinc-800 hover:border-amber-400 hover:bg-zinc-750":"border-red-900/50 bg-zinc-900 opacity-60"}`}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-white font-bold text-base">{s.id==='a'?'Server 1':'Server 2'}</div>
                  <div className="text-xs text-zinc-300 mt-1">{s.id==='a'?'US Only - Fast OTP - Real SIM':'All Countries - 180+ Countries'}</div>
                  <div className="text-[11px] text-zinc-500 mt-2">{s.online? `${s.smsStock||0} live services • ${s.countries?.length||0} countries` : 'Offline - check provider balance'}</div>
                </div>
                <div className={`w-3 h-3 rounded-full ${s.online?'bg-green-500 animate-pulse':'bg-red-500'}`}></div>
              </div>
              <div className="mt-3 text-xs text-amber-400 font-bold">Tap to select →</div>
            </button>
          ))}
          {servers.length===0 && <div className="text-zinc-500 text-sm border border-zinc-800 p-4 rounded-xl">No servers. Add FLEEXA_API_KEY and SMSPOOL_API_KEY in Base44 Secrets then Deploy All.</div>}
        </div>
      </div>
    )
  }

  const filteredServices = (catalog?.smsServices||[]).filter(s=> s.id.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-4 space-y-4 pb-24 max-w-2xl mx-auto">
      <div className="flex justify-between items-center">
        <button onClick={()=>{ setSelectedServer(null); setCatalog(null); setCountry(''); }} className="text-xs text-zinc-400 border border-zinc-700 px-3 py-1.5 rounded-full hover:bg-zinc-800">← Change Server</button>
        <div className="text-xs text-white font-bold bg-zinc-800 px-3 py-1 rounded-full">{selectedServer==='a'?'Server 1 - US Only':'Server 2 - All Countries'} {country? `• ${country}`:''}</div>
      </div>

      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search WhatsApp, Telegram, Google..." className="w-full bg-zinc-800 border border-zinc-700 rounded-full px-4 py-2.5 text-sm text-white outline-none" />

      {selectedServer==='a' && (
        <div className="space-y-3">
          <div className="flex gap-2 overflow-x-auto">
            <button onClick={()=>setTab('sms')} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap ${tab==='sms'?"bg-amber-400 text-black":"bg-zinc-800 text-zinc-300"}`}>SMS OTP</button>
            <button onClick={()=>setTab('email')} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap ${tab==='email'?"bg-amber-400 text-black":"bg-zinc-800 text-zinc-300"}`}>Email OTP</button>
            <button onClick={()=>setTab('rent')} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap ${tab==='rent'?"bg-amber-400 text-black":"bg-zinc-800 text-zinc-300"}`}>Rent 1-12mo</button>
          </div>

          {tab==='sms' && (
            <div className="space-y-2">
              {filteredServices.map(item=>{
                const p = prices[item.id];
                return (
                  <div key={item.id} className="bg-zinc-800 border border-zinc-700 p-3 rounded-xl flex justify-between items-center">
                    <div><div className="text-white text-sm font-bold capitalize">{item.id}</div><div className="text-[11px] text-zinc-400">US • {item.available||0} available</div></div>
                    <div className="text-right">
                      <div className="text-amber-400 text-xs font-bold">{p? formatNaira(p.customerPrice) : '...'}</div>
                      <button disabled={buying===item.id} onClick={()=>handleBuy(item.id)} className="mt-1 text-[11px] bg-white text-black px-3 py-1 rounded-full font-bold disabled:opacity-50">{buying===item.id?'Buying...':'Buy Now'}</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          {tab==='email' && <div className="text-zinc-400 text-sm p-4">Email OTP live - same buy flow</div>}
          {tab==='rent' && (
            <div className="space-y-2">
              {Array.from({length:12}).map((_,i)=>(
                <div key={i} className="bg-zinc-800 border border-zinc-700 p-3 rounded-xl flex justify-between">
                  <span className="text-white text-sm">{i+1} Month</span>
                  <span className="text-amber-400 text-xs">{formatNaira(4500*(i+1))}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedServer==='b' && (
        <div className="space-y-3">
          {!country && (
            <div className="space-y-2">
              <div className="text-sm text-white font-bold">Select Country First</div>
              <div className="grid grid-cols-2 gap-2">
                {(catalog?.countries||[]).map(c=>(
                  <button key={c.code} onClick={()=>selectCountry(c.code,c.name)} className="bg-zinc-800 border border-zinc-700 p-3 rounded-xl text-left hover:border-amber-400">
                    <div className="text-white text-sm font-bold">{c.code}</div><div className="text-xs text-zinc-400">{c.name}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
          {country && (
            <div className="space-y-2">
              <div className="flex justify-between items-center"><div className="text-xs text-zinc-400">Live for {country}</div><button onClick={()=>setCountry('')} className="text-xs text-amber-400">Change</button></div>
              {filteredServices.slice(0,50).map(item=>{
                const p = prices[item.id];
                return (
                  <div key={item.id} className="bg-zinc-800 border border-zinc-700 p-3 rounded-xl flex justify-between items-center">
                    <div><div className="text-white text-sm font-bold capitalize">{item.id}</div><div className="text-[11px] text-zinc-400">{country} • Live</div></div>
                    <div className="text-right">
                      <div className="text-amber-400 text-xs font-bold">{p? formatNaira(p.customerPrice) : '...'}</div>
                      <button disabled={buying===item.id} onClick={()=>handleBuy(item.id)} className="mt-1 text-[11px] bg-white text-black px-3 py-1 rounded-full font-bold">{buying===item.id?'Buying...':'Buy Now'}</button>
                    </div>
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

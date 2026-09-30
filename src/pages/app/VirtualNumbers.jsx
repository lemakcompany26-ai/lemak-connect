import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { formatNaira } from '@/lib/format';

export default function VirtualNumbers() {
  const [servers, setServers] = useState([]);
  const [selected, setSelected] = useState('a');
  const [country, setCountry] = useState('US');
  const [catalog, setCatalog] = useState(null);

  const load = useCallback(async () => {
    try {
      const r = await base44.functions.invoke('virtualNumbers', { action: 'provider_catalog' });
      const d = r.data || r;
      setServers(d.servers || []);
      const active = (d.servers || []).find(s => s.id === selected) || (d.servers || [])[0];
      if (active) setCatalog(active);
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-white text-xl font-bold">Virtual Numbers - LIVE</h1>
      <div className="grid grid-cols-2 gap-3">
        {servers.map(s => (
          <button key={s.id} onClick={() => { setSelected(s.id); setCatalog(s); setCountry(s.id==='a'?'US': (s.countries?.[0]?.code||'NG'))}}
          className={`p-4 rounded-2xl border ${selected===s.id?'border-amber-400 bg-amber-400/10':'border-zinc-700 bg-zinc-800'}`}>
            <div className="text-white font-bold">Server {s.id==='a'?'1 - Fleexa US Only':'2 - SmsPool All'}</div>
            <div className="text-xs text-zinc-400">{s.online? `${s.smsStock} live · ${s.countries?.length} countries` : 'offline'}</div>
          </button>
        ))}
      </div>
      {catalog && (
        <div className="space-y-2">
          <div className="flex gap-2 overflow-x-auto">
            {catalog.countries?.map((c:any) => (
              <button key={c.code} onClick={()=>setCountry(c.code)} className={`px-3 py-1 rounded-full text-xs ${country===c.code?'bg-blue-600 text-white':'bg-zinc-800 text-zinc-300'}`}>{c.code} {c.name}</button>
            ))}
          </div>
          <div className="text-xs text-zinc-500">Country: {country} - OTP will enter in chat</div>
          <div className="grid gap-2">
            {catalog.smsServices?.slice(0,50).map((s:any) => (
              <div key={s.id} className="bg-zinc-800 p-3 rounded-xl flex justify-between"><span className="text-white text-sm">{s.id}</span><span className="text-amber-400 text-xs">{s.available?? 'live'}</span></div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarClock, CheckCircle2, ClipboardList, Hash, Loader2, Mail, MessageCircle, Phone, RefreshCw, Search, Server } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { useApp } from '@/lib/AppContext';
import { formatNaira } from '@/lib/format';
import CatalogRow from '@/components/vnum/CatalogRow';
import CatalogSection from '@/components/vnum/CatalogSection';
import BuySheet from '@/components/vnum/BuySheet';
import RentSheet from '@/components/vnum/RentSheet';
import RentalCard from '@/components/vnum/RentalCard';
import RentalChatDialog from '@/components/vnum/RentalChatDialog';

const SOCIAL = new Set(['whatsapp','telegram','facebook','instagram','tiktok','twitter','x','google','youtube','snapchat','discord','linkedin','reddit','microsoft','apple','threads','signal']);
const FILTERS = [{id:'all',label:'All'},{id:'social',label:'Social Media'},{id:'other',label:'Other Services'},{id:'rental',label:'Rental'},{id:'email',label:'Email'}];
const flag = (code) => { try{ return code.replace(/./g,ch=>String.fromCodePoint(0x1F1E6+ch.charCodeAt(0)-65)); }catch{return '🌍'} };

export default function VirtualNumbers(){
  const { toast } = useToast();
  const { refresh } = useApp();
  const navigate = useNavigate();
  const [catalog,setCatalog]=useState(null);
  const [servers,setServers]=useState(null);
  const [selectedServer,setSelectedServer]=useState('a');
  const [country,setCountry]=useState('US');
  const [filter,setFilter]=useState('all');
  const [search,setSearch]=useState('');
  const [prices,setPrices]=useState({});
  const requestedRef=useRef(new Set());
  const [orders,setOrders]=useState(null);
  const [view,setView]=useState('catalog');
  const [buy,setBuy]=useState(null);
  const [rentService,setRentService]=useState(null);
  const [chat,setChat]=useState(null);
  const [busy,setBusy]=useState(false);

  const loadCatalog = useCallback(async()=>{
    try{
      const res = await base44.functions.invoke('virtualNumbers',{action:'provider_catalog'});
      const d = res.data || res;
      const all = d.servers || [];
      setServers(all);
      const active = all.find(s=>s.id===selectedServer) || all.find(s=>s.online) || all[0];
      if(active){
        setCatalog(active);
        setSelectedServer(active.id);
        if(active.id==='a'){ setCountry('US'); }
        else{
          const codes=(active.countries||[]).map(c=>c.code);
          setCountry(prev=> prev && codes.includes(prev)? prev : (codes.includes('NG')?'NG':codes[0]||'US'));
        }
      }
    }catch{ setServers([]); }
  },[]);

  useEffect(()=>{ loadCatalog(); },[loadCatalog]);
  useEffect(()=>{ const t=setInterval(loadCatalog,60000); return()=>clearInterval(t); },[loadCatalog]);

  const loadOrders = useCallback(()=>{
    base44.functions.invoke('virtualNumbers',{action:'my_rentals'}).then(res=>setOrders((res.data||res).rentals||[])).catch(()=>setOrders([]));
  },[]);
  useEffect(()=>{ loadOrders(); },[loadOrders]);

  const sms = catalog?.smsServices || [];
  const q = search.trim().toLowerCase();
  const socialRows = useMemo(()=> sms.filter(s=> SOCIAL.has(s.id.toLowerCase()) && (!q || s.id.toLowerCase().includes(q))),[sms,q]);
  const otherRows = useMemo(()=> sms.filter(s=>!SOCIAL.has(s.id.toLowerCase()) && (!q || s.id.toLowerCase().includes(q))),[sms,q]);
  const rentRows = useMemo(()=> (catalog?.rentServices||[]).filter(id=>!q||id.toLowerCase().includes(q)),[catalog,q]);
  const emailRows = useMemo(()=> (catalog?.emailProducts||[]).filter(p=>!q||p.id.toLowerCase().includes(q)),[catalog,q]);

  const visibleIds = useMemo(()=>{
    let ids=[];
    if(filter==='all'||filter==='social') ids=ids.concat(socialRows.map(s=>s.id));
    if(filter==='all'||filter==='other') ids=ids.concat(otherRows.slice(0,60).map(s=>s.id));
    return ids;
  },[filter,socialRows,otherRows]);

  useEffect(()=>{
    if(!catalog||!selectedServer||!country||!catalog.online) return;
    const missing = visibleIds.filter(id=>!requestedRef.current.has(`${country}:${selectedServer}:${id}`)).slice(0,48);
    if(!missing.length) return;
    missing.forEach(id=>requestedRef.current.add(`${country}:${selectedServer}:${id}`));
    (async()=>{
      for(let i=0;i<missing.length;i+=12){
        const batch=missing.slice(i,i+12);
        try{
          const res=await base44.functions.invoke('virtualNumbers',{action:'quote',serverId:selectedServer,country,services:batch});
          setPrices(prev=>({...prev,...((res.data||res).prices||{})}));
        }catch{
          const failed={}; batch.forEach(id=>{ failed[id]={available:false,customerPrice:null}; });
          setPrices(prev=>({...prev,...failed}));
        }
      }
    })();
  },[catalog,country,selectedServer,visibleIds]);

  const chooseServer=(server)=>{
    if(!server.online) return;
    setSelectedServer(server.id);
    setCatalog(server);
    if(server.id==='a') setCountry('US');
    else setCountry((server.countries||[]).some(c=>c.code===country)?country:((server.countries||[])[0]||{}).code||'US');
    setPrices({});
    requestedRef.current=new Set();
  };

  const priceFor=(id)=>{
    const p=prices[id];
    if(!p) return null;
    return p.available && p.customerPrice? formatNaira(p.customerPrice) : false;
  };

  const countryName = (catalog?.countries||[]).find(c=>c.code===country)?.name || country;
  const activeOrders = (orders||[]).filter(r=>r.status==='active').length;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-white flex items-center gap-2.5"><Phone className="w-6 h-6 text-amber-400" /> Virtual Numbers</h1>
          <p className="text-sm text-slate-400 mt-1">Live numbers — OTP arrives in chat automatically.</p>
        </div>
        <Button size="icon" variant="outline" className="h-9 w-9 border-mk-border" onClick={loadCatalog}><RefreshCw className="w-3.5 h-3.5" /></Button>
      </div>

      <section className="space-y-2.5">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-slate-400"><Server className="h-3.5 w-3.5 text-amber-400" /> Choose a server</div>
        <div className="grid gap-3 sm:grid-cols-2">
          {(servers||[]).map(server=>(
            <button key={server.id} type="button" disabled={!server.online} onClick={()=>chooseServer(server)} className={'rounded-2xl border p-4 text-left transition-colors '+(selectedServer===server.id?'border-amber-400 bg-amber-400/10':'border-mk-border bg-mk-card2 hover:border-amber-400/60')+(!server.online?' opacity-60':'')}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-base font-extrabold text-white">Server {server.id==='a'?'1 (Fleexa US Only)':'2 (SmsPool All Countries)'}</div>
                  <div className="mt-1 text-xs font-semibold text-slate-400">{server.id==='a'?'Real US SIMs · 1-12 months rental':'All countries · 1-12 months rental'}</div>
                </div>
                {selectedServer===server.id && <CheckCircle2 className="h-5 w-5 shrink-0 text-amber-400" />}
              </div>
              <div className="mt-3 text-[11px] font-bold text-slate-400">{server.online?`${server.smsStock} live services · ${(server.countries||[]).length} countries`:'Currently unavailable'}</div>
            </button>
          ))}
        </div>
      </section>

      <div className="relative"><Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" /><Input value={search} onChange={(e)=>setSearch(e.target.value.slice(0,40))} placeholder="Search whatsapp, telegram..." className="bg-mk-card2 border-mk-border text-slate-100 h-12 pl-10 rounded-2xl" /></div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {FILTERS.map(f=><button key={f.id} onClick={()=>setFilter(f.id)} className={'shrink-0 rounded-full border px-3.5 py-1.5 text-[11px] font-bold '+(filter===f.id?'border-amber-400 bg-amber-400 text-slate-900':'border-mk-border bg-mk-card2 text-slate-300')}>{f.label}</button>)}
        <button onClick={()=>setView(v=>v==='catalog'?'orders':'catalog')} className={'shrink-0 ml-auto inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[11px] font-bold '+(view==='orders'?'border-amber-400 bg-amber-400 text-slate-900':'border-mk-border bg-mk-card2 text-slate-300')}><ClipboardList className="w-3.5 h-3.5" /> My Orders {activeOrders>0 && <span className="min-w-4 h-4 px-1 rounded-full bg-mk-blue text-white text-[9px] font-bold inline-flex items-center justify-center">{activeOrders}</span>}</button>
      </div>

      {view==='catalog' && (
        <div className="space-y-7">
          {catalog===null && <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-amber-400" /></div>}
          {catalog?.online && (
            <>
              {(catalog.countries||[]).length>0 && (
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Country {selectedServer==='a' && '(US Only)'}</div>
                  <div className="flex gap-1.5 overflow-x-auto pb-1">
                    {(catalog.countries||[]).map(c=>(
                      <button key={c.code} onClick={()=>{setCountry(c.code); setPrices({}); requestedRef.current=new Set();}} className={'shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold '+(country===c.code?'border-mk-blue bg-mk-blue text-white':'border-mk-border bg-mk-card2 text-slate-300')}><span>{flag(c.code)}</span> {c.name}</button>
                    ))}
                  </div>
                </div>
              )}
              <CatalogSection icon={MessageCircle} title="Social Media OTP" count={socialRows.length} empty={socialRows.length===0} emptyText="No social services.">
                {socialRows.map(s=><CatalogRow key={s.id} name={s.id} availability={s.available===null?'Available on demand - OTP in chat':`Available: ${s.available}`} price={priceFor(s.id)} onAction={()=>setBuy({product:'sms',service:s.id,country,countryName,serverId:selectedServer})} />)}
              </CatalogSection>
              {(filter==='all'||filter==='other') && (
                <CatalogSection icon={Hash} title="Other OTP Services" count={otherRows.length} empty={otherRows.length===0} emptyText="No other services.">
                  {otherRows.slice(0,60).map(s=><CatalogRow key={s.id} name={s.id} availability="OTP enters in chat automatically" price={priceFor(s.id)} onAction={()=>setBuy({product:'sms',service:s.id,country,countryName,serverId:selectedServer})} />)}
                </CatalogSection>
              )}
              {(filter==='all'||filter==='rental') && (
                <CatalogSection icon={CalendarClock} title="Rent a Number (1-12 months)" count={(catalog?.rentServices||[]).length} empty={(catalog?.rentServices||[]).length===0} emptyText="Rentals not available.">
                  {(catalog?.rentServices||[]).map(id=><CatalogRow key={id} name={id} availability="Dedicated number · 1-12 months · OTP in chat" price={catalog?.rentAreas?.[0]?.durations?.[0]?.customerPrice?`from ${formatNaira(catalog.rentAreas[0].durations[0].customerPrice)}/mo`:null} actionLabel="Rent Number" onAction={()=>setRentService(id)} />)}
                </CatalogSection>
              )}
              {(filter==='all'||filter==='email') && (
                <CatalogSection icon={Mail} title="Email Verification" count={emailRows.length} empty={emailRows.length===0} emptyText="Email not available.">
                  {emailRows.map(p=><CatalogRow key={p.id} name={p.id} availability="Temporary email

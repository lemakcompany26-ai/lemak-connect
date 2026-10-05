import { useEffect, useState } from "react";
import { Loader2, RefreshCw, Copy, X } from "lucide-react";
import { base44 } from "@/api/base44Client";

const money = n => `₦${Number(n||0).toLocaleString("en-NG",{minimumFractionDigits:2})}`;
const getErr = e => e?.response?.data?.error || e?.message || "Request failed";

export default function VirtualNumbers(){
  const [server,setServer]=useState("a");
  const [servers,setServers]=useState([]);
  const [services,setServices]=useState([]);
  const [countries,setCountries]=useState([]);
  const [country,setCountry]=useState("");
  const [prices,setPrices]=useState({});
  const [active,setActive]=useState(null);
  const [otp,setOtp]=useState(null);
  const [loading,setLoading]=useState(true);
  const [buying,setBuying]=useState(false);
  const [error,setError]=useState("");

  const call=async p=>{
    const r=await base44.functions.invoke("virtualNumbers",p);
    const d=r?.data||r;
    if(!d?.success)throw Error(d?.error||"Request failed");
    return d;
  };

  const load=async s=>{
    try{
      setLoading(true);setError("");
      const [sv,co]=await Promise.all([
        call({action:"services",serverId:s}),
        call({action:"countries",serverId:s})
      ]);
      setServices(sv.services||[]);
      setCountries(co.countries||[]);
      setCountry(s==="a"?"US":co.countries?.[0]?.providerId||"");
      setPrices({});
    }catch(e){setError(getErr(e))}
    finally{setLoading(false)}
  };

  useEffect(()=>{
    call({action:"catalog"})
      .then(d=>{
        setServers(d.servers||[]);
        const s=d.servers?.find(x=>x.available)?.id||"a";
        setServer(s);load(s);
      })
      .catch(e=>setError(getErr(e)));
  },[]);

  useEffect(()=>{
    if(!services.length)return;
    services.forEach(async x=>{
      try{
        const d=await call({
          action:"price",
          serverId:server,
          service:x.realId||x.id,
          country
        });
        setPrices(p=>({...p,[x.id]:d}));
      }catch{}
    });
  },[services,country,server]);

  const buy=async x=>{
    const p=prices[x.id];
    if(!p?.customerPrice)return alert("Live price is still loading.");
    if(server==="b"&&!country)return alert("Select a country.");

    if(!confirm(`Buy ${x.name} for ${money(p.customerPrice)}?`))return;

    try{
      setBuying(true);setError("");
      const u=await base44.auth.me();
      if(!u?.email)throw Error("Please log in first.");

      const c=countries.find(y=>(y.providerId||y.id)===country);

      const d=await call({
        action:"order",
        serverId:server,
        userEmail:u.email,
        service:x.realId||x.id,
        realId:x.realId||x.id,
        country,
        countryName:server==="a"?"United States":c?.name||country,
        countryProviderId:c?.providerId||country,
        price:p.customerPrice
      });

      setActive({...d,serviceName:x.name});
      setOtp(null);
      alert(`Number: ${d.phone}\nOrder: ${d.orderId}`);
    }catch(e){setError(getErr(e))}
    finally{setBuying(false)}
  };

  const check=async()=>{
    if(!active)return;
    try{
      const d=await call({
        action:"checkOtp",
        serverId:active.serverId||server,
        orderId:active.orderId,
        requestId:active.requestId
      });
      setOtp(d);
    }catch{}
  };

  useEffect(()=>{
    if(!active)return;
    check();
    const t=setInterval(check,10000);
    return()=>clearInterval(t);
  },[active?.orderId]);

  const cancel=async()=>{
    if(!active||!confirm("Cancel and refund?"))return;
    try{
      setBuying(true);
      const d=await call({
        action:"cancel",
        serverId:active.serverId||server,
        orderId:active.orderId,
        requestId:active.requestId
      });
      alert(d.message||"Cancelled.");
      setActive(null);setOtp(null);
    }catch(e){setError(getErr(e))}
    finally{setBuying(false)}
  };

  if(loading)return <div className="p-10 text-center"><Loader2 className="mx-auto animate-spin"/></div>;

  return (
    <div className="max-w-5xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Virtual Numbers</h1>

      {error&&<div className="p-3 mb-4 rounded-xl bg-red-100 text-red-700">{error}</div>}

      <div className="flex gap-2 mb-5">
        {servers.map(s=>(
          <button
            key={s.id}
            disabled={!s.available}
            onClick={()=>{setServer(s.id);load(s.id);setActive(null)}}
            className={`flex-1 p-3 rounded-xl border ${server===s.id?"bg-primary text-white":""}`}
          >
            {s.name}
          </button>
        ))}
      </div>

      {server==="b"&&(
        <select
          value={country}
          onChange={e=>{setCountry(e.target.value);setPrices({})}}
          className="w-full border rounded-xl p-3 mb-5"
        >
          <option value="">Select country</option>
          {countries.map(c=>(
            <option key={c.providerId||c.id} value={c.providerId||c.id}>
              {c.name}
            </option>
          ))}
        </select>
      )}

      {active&&(
        <div className="border-2 border-primary rounded-2xl p-4 mb-5">
          <b className="text-lg">Active Number</b>
          <div className="text-2xl font-bold my-3">{active.phone}</div>

          <button
            className="border p-2 rounded-lg mr-2"
            onClick={()=>navigator.clipboard.writeText(active.phone)}
          >
            <Copy className="w-4 h-4"/>
          </button>

          <div className="my-4 p-4 rounded-xl bg-muted">
            <b>OTP:</b>{" "}
            {otp?.code||otp?.smsText||"Waiting for OTP..."}
          </div>

          <button onClick={check} className="border rounded-xl p-3 mr-2">
            <RefreshCw className="inline w-4 h-4 mr-1"/> Check
          </button>

          <button
            onClick={cancel}
            disabled={buying}
            className="bg-red-600 text-white rounded-xl p-3"
          >
            <X className="inline w-4 h-4 mr-1"/> Cancel & Refund
          </button>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {services.map(x=>{
          const p=prices[x.id];
          return(
            <div key={x.id} className="border rounded-2xl p-4">
              <b>{x.name}</b>
              <div className="text-xl font-bold my-3">
                {p?.customerPrice?money(p.customerPrice):"Loading price..."}
              </div>

              <button
                onClick={()=>buy(x)}
                disabled={buying||!p?.customerPrice||(server==="b"&&!country)}
                className="w-full bg-primary text-white rounded-xl p-3 disabled:opacity-50"
              >
                {buying?"Processing...":"Buy Number"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
            }

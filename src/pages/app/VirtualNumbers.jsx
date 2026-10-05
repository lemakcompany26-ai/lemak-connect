import { useCallback,useEffect,useMemo,useRef,useState } from "react";
import { ArrowLeft,Check,Globe2,Loader2,RefreshCw,Server,X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { formatNaira } from "@/lib/format";
import { Input } from "@/components/ui/input";
import ActiveNumberPanel from "@/components/vnum/ActiveNumberPanel";
import NumberServiceList from "@/components/vnum/NumberServiceList";

export default function VirtualNumbers(){
  const [servers,setServers]=useState([]);
  const [selectedServer,setSelectedServer]=useState(null);
  const [catalog,setCatalog]=useState({services:[],countries:[]});
  const [country,setCountry]=useState("US");
  const [countryName,setCountryName]=useState("United States");
  const [countryProviderId,setCountryProviderId]=useState("US");
  const [prices,setPrices]=useState({});
  const [loading,setLoading]=useState(true);
  const [loadingData,setLoadingData]=useState(false);
  const [loadingPrices,setLoadingPrices]=useState(false);
  const [buying,setBuying]=useState(null);
  const [search,setSearch]=useState("");
  const [error,setError]=useState("");
  const [purchase,setPurchase]=useState(null);
  const [otp,setOtp]=useState(null);
  const [checking,setChecking]=useState(false);
  const [cancelling,setCancelling]=useState(false);
  const [timeLeft,setTimeLeft]=useState(420);
  const poll=useRef(null);

  const dataOf=x=>x?.data??x??{};
  const errOf=(e,f)=>e?.response?.data?.error||e?.response?.data?.message||e?.message||f;

  const stopPoll=useCallback(()=>{
    if(poll.current){clearInterval(poll.current);poll.current=null;}
  },[]);

  const loadCatalog=useCallback(async()=>{
    try{
      setLoading(true);setError("");
      const r=dataOf(await base44.functions.invoke("virtualNumbers",{action:"catalog"}));
      if(!r.success)throw Error(r.error||"Unable to load servers.");
      const list=Array.isArray(r.servers)?r.servers:[];
      setServers(list);
      setSelectedServer(s=>list.find(x=>String(x.id)===String(s?.id))||list[0]||null);
    }catch(e){
      setServers([]);setSelectedServer(null);setError(errOf(e,"Unable to connect to virtual-number backend."));
    }finally{setLoading(false);}
  },[]);

  const loadData=useCallback(async()=>{
    if(!selectedServer?.id)return;
    try{
      setLoadingData(true);setError("");setPrices({});
      const [sr,cr]=await Promise.all([
        base44.functions.invoke("virtualNumbers",{action:"services",serverId:selectedServer.id}),
        base44.functions.invoke("virtualNumbers",{action:"countries",serverId:selectedServer.id})
      ]);
      const s=dataOf(sr),c=dataOf(cr);
      if(!s.success)throw Error(s.error||"Unable to load services.");
      const services=Array.isArray(s.services)?s.services:[];
      const countries=c.success&&Array.isArray(c.countries)?c.countries:[];
      setCatalog({services,countries});

      if(String(selectedServer.id).toLowerCase()==="a"){
        const us=countries.find(x=>String(x.id||x.code||x.providerId).toUpperCase()==="US")||{id:"US",providerId:"US",code:"US",name:"United States"};
        setCountry(us.id||us.code||us.providerId||"US");
        setCountryProviderId(us.providerId||us.id||us.code||"US");
        setCountryName(us.name||us.country||"United States");
      }else if(countries.length){
        const x=countries[0];
        setCountry(x.id||x.code||x.providerId||"");
        setCountryProviderId(x.providerId||x.id||x.code||"");
        setCountryName(x.name||x.country||x.title||x.code||"");
      }else{
        setCountry("");setCountryProviderId("");setCountryName("");
      }
    }catch(e){
      setCatalog({services:[],countries:[]});
      setError(errOf(e,"Unable to load virtual-number services."));
    }finally{setLoadingData(false);}
  },[selectedServer]);

  useEffect(()=>{loadCatalog();},[loadCatalog]);
  useEffect(()=>{loadData();},[loadData]);

  const services=useMemo(()=>{
    const q=search.trim().toLowerCase();
    const list=Array.isArray(catalog.services)?catalog.services:[];
    return q?list.filter(x=>`${x.name||""} ${x.id||""} ${x.title||""}`.toLowerCase().includes(q)):list;
  },[catalog.services,search]);

  const countries=Array.isArray(catalog.countries)?catalog.countries:[];

  useEffect(()=>{
    if(!selectedServer?.id||!services.length)return;
    let stop=false;
    (async()=>{
      setLoadingPrices(true);setPrices({});
      for(const item of services){
        if(stop)break;
        try{
          const d=dataOf(await base44.functions.invoke("virtualNumbers",{
            action:"price",serverId:selectedServer.id,service:item.id,
            realId:item.realId||item.id,country,countryProviderId
          }));
          if(!stop)setPrices(p=>({...p,[item.id]:d.success?d:{error:d.error||"Price unavailable."}}));
        }catch(e){
          if(!stop)setPrices(p=>({...p,[item.id]:{error:errOf(e,"Price unavailable.")}}));
        }
      }
      if(!stop)setLoadingPrices(false);
    })();
    return()=>{stop=true};
  },[services,selectedServer,country,countryProviderId]);

  const changeCountry=e=>{
    const v=e.target.value;
    const x=countries.find(a=>String(a.id||a.code||a.providerId)===String(v));
    setCountry(x?.id||x?.code||x?.providerId||v);
    setCountryProviderId(x?.providerId||x?.id||x?.code||v);
    setCountryName(x?.name||x?.country||x?.title||v);
    setPrices({});
  };

  const changeServer=s=>{
    stopPoll();setSelectedServer(s);setSearch("");setPrices({});
    setPurchase(null);setOtp(null);setTimeLeft(420);setError("");
  };

  const buy=async item=>{
    const p=prices[item.id];
    const price=Number(p?.customerPrice??p?.price??p?.sellingPrice);
    if(!selectedServer?.id)return alert("Please select a server.");
    if(!p||p.error||!Number.isFinite(price)||price<=0)return alert(p?.error||"Live price is not available yet.");
    if(!country)return alert("Please select a country.");
    const name=item.name||item.title||item.service||item.id;
    if(!window.confirm(`Buy ${name} for ${formatNaira(price)}?`))return;

    try{
      setBuying(item.id);setError("");setOtp(null);
      const user=await base44.auth.me();
      if(!user?.email)throw Error("Please log in before buying a virtual number.");

      const d=dataOf(await base44.functions.invoke("virtualNumbers",{
        action:"order",serverId:selectedServer.id,service:item.id,
        realId:item.realId||item.id,country,countryName,countryProviderId,
        price,userEmail:user.email,userId:user.id||user._id||"",serviceName:name
      }));

      if(!d.success)throw Error(d.error||d.message||"Unable to purchase this number.");

      const phone=d.phone||d.number||d.phoneNumber||d.msisdn;
      const orderId=d.orderId||d.requestId||d.rentalId||d.id;
      if(!phone)throw Error("Provider did not return a phone number.");
      if(!orderId)throw Error("Provider did not return an order ID.");

      const x={
        phone,orderId,requestId:d.requestId||orderId,rentalId:d.rentalId||orderId,
        charged:d.charged??d.customerPrice??price,
        customerPrice:d.customerPrice??price,providerPrice:d.providerPrice,
        currency:d.currency||"NGN",service:name,serviceId:item.id,
        country:d.country||country,countryName:d.countryName||countryName,
        status:d.status||"waiting_sms",serverId:selectedServer.id
      };

      setPurchase(x);setOtp(null);setTimeLeft(420);
      alert(`Virtual number purchased successfully.\n\nNumber: ${x.phone}\nOrder ID: ${x.orderId}`);
    }catch(e){
      const m=errOf(e,"Unable to purchase virtual number.");
      setError(m);alert(m);
    }finally{setBuying(null);}
  };

  const checkOtp=useCallback(async()=>{
    if(!purchase?.orderId&&!purchase?.requestId||checking)return;
    try{
      setChecking(true);
      const d=dataOf(await base44.functions.invoke("virtualNumbers",{
        action:"checkOtp",serverId:purchase.serverId||selectedServer?.id,
        orderId:purchase.orderId||purchase.requestId,
        requestId:purchase.requestId||purchase.orderId,
        rentalId:purchase.rentalId||purchase.orderId
      }));
      if(!d.success)throw Error(d.error||d.message||"Unable to check OTP.");
      const code=d.code||d.otp||d.verificationCode||"";
      setOtp({
        status:d.status||(code?"completed":"waiting_sms"),
        code:String(code),smsText:d.smsText||d.sms||d.message||"",
        phone:d.phone||d.number||purchase.phone
      });
      if(code){setTimeLeft(0);stopPoll();}
    }catch(e){setError(errOf(e,"Unable to check OTP."));}
    finally{setChecking(false);}
  },[purchase,selectedServer,checking,stopPoll]);

  const cancel=async()=>{
    if(!purchase?.orderId&&!purchase?.requestId)return;
    if(!window.confirm("Cancel this number and request a refund if supported?"))return;
    try{
      setCancelling(true);setError("");stopPoll();
      const d=dataOf(await base44.functions.invoke("virtualNumbers",{
        action:"cancel",serverId:purchase.serverId||selectedServer?.id,
        orderId:purchase.orderId||purchase.requestId,
        requestId:purchase.requestId||purchase.orderId,
        rentalId:purchase.rentalId||purchase.orderId
      }));
      if(!d.success)throw Error(d.error||d.message||"Unable to cancel this order.");
      setPurchase(null);setOtp(null);setTimeLeft(420);
      alert(d.message||"Virtual-number order cancelled.");
    }catch(e){const m=errOf(e,"Unable to cancel order.");setError(m);alert(m);}
    finally{setCancelling(false);}
  };

  useEffect(()=>{
    if(!purchase||timeLeft<=0)return;
    const t=setInterval(()=>setTimeLeft(v=>v<=1?0:v-1),1000);
    return()=>clearInterval(t);
  },[purchase]);

  useEffect(()=>{
    stopPoll();
    if(!purchase||timeLeft<=0)return;
    checkOtp();
    poll.current=setInterval(checkOtp,10000);
    return stopPoll;
  },[purchase,timeLeft,checkOtp,stopPoll]);

  useEffect(()=>()=>stopPoll(),[stopPoll]);

  const timer=`${String(Math.floor(timeLeft/60)).padStart(2,"0")}:${String(timeLeft%60).padStart(2,"0")}`;

  const copy=async()=>{
    if(!purchase?.phone)return;
    try{await navigator.clipboard.writeText(String(purchase.phone));alert("Phone number copied.");}
    catch{alert(purchase.phone);}
  };

  if(loading&&!servers.length)return(
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600"/>
        <p className="text-sm text-muted-foreground">Loading real numbers...</p>
      </div>
    </div>
  );

  return(
    <div className="min-h-screen bg-background pb-24">
      <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={()=>window.history.back()} className="flex h-10 w-10 items-center justify-center rounded-xl border bg-card">
              <ArrowLeft className="h-5 w-5"/>
            </button>
            <div>
              <h1 className="text-xl font-bold">Real Numbers</h1>
              <p className="text-sm text-muted-foreground">Rent real numbers for SMS and OTP verification</p>
            </div>
          </div>
          <button onClick={loadCatalog} className="flex h-10 w-10 items-center justify-center rounded-xl border bg-card">
            <RefreshCw className={`h-5 w-5 ${loading?"animate-spin":""}`}/>
          </button>
        </div>

        {error&&(
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <X className="h-5 w-5 shrink-0"/>
            <div className="flex-1">{error}</div>
            <button onClick={()=>setError("")}><X className="h-4 w-4"/></button>
          </div>
        )}

        <ActiveNumberPanel
          purchase={purchase}
          otp={otp}
          timerLabel={timer}
          checking={checking}
          cancelling={cancelling}
          onCopy={copy}
          onCheck={checkOtp}
          onCancel={cancel}
          onClose={()=>{stopPoll();setPurchase(null);setOtp(null);setTimeLeft(420);}}
        />

        <div className="mb-6">
          <h2 className="mb-3 text-sm font-semibold">Choose Server</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {servers.map(s=>{
              const active=String(selectedServer?.id)===String(s.id);
              return(
                <button key={s.id} onClick={()=>changeServer(s)}
                  className={`rounded-2xl border p-4 text-left ${active?"border-blue-600 bg-blue-50 ring-2 ring-blue-100":"bg-card hover:border-blue-300"}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${active?"bg-blue-600 text-white":"bg-muted"}`}>
                        <Server className="h-5 w-5"/>
                      </div>
                      <div>
                        <div className="font-semibold">{s.name||`Server ${s.id}`}</div>
                        {s.description&&<div className="text-xs text-muted-foreground">{s.description}</div>}
                      </div>
                    </div>
                    {active&&<Check className="h-5 w-5 text-blue-600"/>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {loadingData?(
          <div className="rounded-2xl border bg-card p-8 text-center">
            <Loader2 className="mx-auto h-7 w-7 animate-spin text-blue-600"/>
            <p className="mt-3 text-sm text-muted-foreground">Loading services...</p>
          </div>
        ):(
          <>
            {countries.length>0&&(
              <div className="mb-3">
                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold">
                  <Globe2 className="h-4 w-4"/>Country
                </label>
                <select value={country} onChange={changeCountry}
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                  {countries.map((x,i)=>{
                    const v=x.id||x.code||x.providerId||`country-${i}`;
                    return <option key={`${v}-${i}`} value={v}>{x.name||x.country||x.title||x.code||v}</option>;
                  })}
                </select>
              </div>
            )}

            <Input
              value={search}
              onChange={e=>setSearch(e.target.value)}
              placeholder="Search services (WhatsApp, Telegram, Google...)"
            />

            <div className="mt-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold">Select Service</h2>
                {loadingPrices&&<Loader2 className="h-4 w-4 animate-spin text-blue-600"/>}
              </div>

              {services.length?(
                <NumberServiceList
                  services={services}
                  prices={prices}
                  loadingPrices={loadingPrices}
                  buying={buying}
                  onBuy={buy}
                />
              ):(
                <div className="rounded-2xl border bg-card p-8 text-center">
                  <p className="font-medium">No services available</p>
                  <p className="mt-1 text-sm text-muted-foreground">Try another server or country.</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
                                                          }

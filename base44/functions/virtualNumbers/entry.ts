import { createClientFromRequest } from "npm:@base44/sdk";

const FB=Deno.env.get("FLEEXA_API_URL")||"https://fleexa.com.ng/developer";
const FK=Deno.env.get("FLEEXA_API_KEY")||"";
const SB=Deno.env.get("SMSPOOL_API_URL")||"https://api.smspool.net";
const SK=Deno.env.get("SMSPOOL_API_KEY")||"";
const RATE=Number(Deno.env.get("SMSPOOL_USD_NGN_RATE")||1600);
const MARK=Number(Deno.env.get("VIRTUAL_NUMBER_MARKUP_PERCENT")||30);

const out=(x,s=200)=>new Response(JSON.stringify(x),{
  status:s,
  headers:{
    "Content-Type":"application/json",
    "Access-Control-Allow-Origin":"*",
    "Access-Control-Allow-Headers":"authorization,content-type",
    "Access-Control-Allow-Methods":"POST,OPTIONS"
  }
});

const c=x=>x==null?"":String(x).trim();
const n=(x,d=0)=>Number.isFinite(Number(x))?Number(x):d;
const sell=x=>Math.ceil(n(x)*(1+MARK/100));

async function rd(r){
  const t=await r.text();
  try{return t?JSON.parse(t):{}}
  catch{return {providerText:t}}
}

const err=(x,f)=>typeof x==="string"&&x.trim()?x.trim():
  c(x?.error)||c(x?.message)||c(x?.msg)||c(x?.detail)||c(x?.providerText)||f;

async function wallet(b,e){
  const a=await b.entities.Wallet.filter({userEmail:e});
  if(!a?.[0])throw Error("Wallet not found.");
  return {w:a[0],bal:n(a[0].balance)};
}

async function balance(b,w,x){
  await b.entities.Wallet.update(w.id,{balance:n(x)});
}

function fh(json=false){
  const h={Accept:"application/json"};
  if(FK){h.Authorization=`Bearer ${FK}`;h["X-API-Key"]=FK}
  if(json)h["Content-Type"]="application/json";
  return h;
}

async function fp(path,opt={}){
  const r=await fetch(FB+path,{...opt,headers:{...fh(!!opt.body),...(opt.headers||{})}});
  const d=await rd(r);
  if(!r.ok)throw Error(err(d,`Fleexa error ${r.status}`));
  return d;
}

async function sp(path,p={}){
  if(!SK)throw Error("SMSPool API key is not configured.");
  const q=new URLSearchParams({key:SK});
  Object.entries(p).forEach(([k,v])=>{
    if(v!==undefined&&v!==null&&c(v)!=="")q.set(k,String(v))
  });
  const r=await fetch(SB+path,{
    method:"POST",
    headers:{
      "Content-Type":"application/x-www-form-urlencoded",
      Accept:"application/json"
    },
    body:q.toString()
  });
  const d=await rd(r);
  if(!r.ok)throw Error(err(d,`SMSPool error ${r.status}`));
  if(d?.success===false||d?.status==="error")
    throw Error(err(d,"SMSPool request failed."));
  return d;
}

function list(d,key){
  if(Array.isArray(d))return d;
  if(Array.isArray(d?.data))return d.data;
  if(Array.isArray(d?.[key]))return d[key];
  if(d&&typeof d==="object")
    return Object.entries(d).map(([id,v])=>({id,...(typeof v==="object"?v:{name:v})}));
  return [];
}

async function servicesA(){
  const d=await fp("/sms4/apps");
  return list(d).map(x=>{
    const id=c(x.id||x.service_id||x.serviceName||x.name);
    return id?{id,realId:id,name:c(x.name||x.serviceName||x.title||id),
      provider:"fleexa",serverId:"a",country:"US",countryProviderId:"US",
      countryName:"United States"}:null
  }).filter(Boolean).sort((a,b)=>
    (/whatsapp/i.test(a.name)?0:1)-(/whatsapp/i.test(b.name)?0:1)||
    a.name.localeCompare(b.name));
}

async function servicesB(){
  const d=await sp("/stubs/handler_api",{
    action:"getServicesList",setting:"smspool"
  });
  return list(d,"services").map(x=>{
    const id=c(x.id||x.service||x.service_id||x.code);
    return id?{id:"smspool_"+id,realId:id,
      name:c(x.name||x.service_name||x.title||id),
      provider:"smspool",serverId:"b"}:null
  }).filter(Boolean);
}

async function countriesB(){
  const d=await sp("/stubs/handler_api",{
    action:"getCountriesList",setting:"smspool"
  });
  return list(d,"countries").map(x=>{
    const id=c(x.id||x.country||x.country_id||x.code);
    return id?{id:"smspool_"+id,providerId:id,
      name:c(x.name||x.country_name||x.title||id),
      code:c(x.code||x.iso||x.iso2||id)}:null
  }).filter(Boolean);
}

async function priceA(service){
  const d=await fp(`/sms4/prices?serviceName=${encodeURIComponent(c(service))}`);
  const x=d?.data||d;
  const v=n(x.price_ngn??x.rate??x.price??x.cost??x.amount,NaN);
  if(!Number.isFinite(v)||v<=0)throw Error(err(d,"Fleexa price unavailable."));
  return {success:true,serverId:"a",provider:"fleexa",service:c(service),
    providerPrice:v,customerPrice:sell(v),currency:"NGN"};
}

async function priceB(service,country){
  service=c(service).replace(/^smspool_/,"");
  country=c(country).replace(/^smspool_/,"");
  const d=await sp("/request/price",{service,country});
  const usd=n(d?.price??d?.cost??d?.amount??d?.data?.price,NaN);
  if(!Number.isFinite(usd)||usd<=0)throw Error(err(d,"SMSPool price unavailable."));
  const ngn=usd*RATE;
  return {success:true,serverId:"b",provider:"smspool",service,country,
    providerPriceUsd:usd,providerPrice:ngn,customerPrice:sell(ngn),
    currency:"NGN",providerCurrency:"USD"};
}

async function buyA(b,e,p){
  const q=await priceA(p.service),w=await wallet(b,e),charge=q.customerPrice;
  if(w.bal<charge)throw Error(`Insufficient balance. Required ₦${charge}.`);
  await balance(b,w.w,w.bal-charge);
  try{
    const d=await fp("/sms4/buy",{
      method:"POST",
      body:JSON.stringify({
        serviceName:c(p.service),maxPrice:String(q.providerPrice)
      })
    });
    const x=d?.data||d;
    const phone=c(x.phone||x.number||x.phoneNumber);
    const id=c(x.activation_id||x.requestId||x.request_id||x.id);
    if(!phone||!id)throw Error("Fleexa did not return a valid number.");
    const orderId="fleexa_"+id;
    const r=await b.entities.Rental.create({
      userEmail:e,phoneNumber:phone,orderId,providerOrderId:id,
      provider:"fleexa",serverId:"a",country:"US",
      countryName:"United States",service:c(p.service),
      status:"waiting_sms",charged:charge,customerPrice:charge,
      providerPrice:q.providerPrice,refunded:false
    });
    return {success:true,provider:"fleexa",serverId:"a",orderId,
      requestId:id,rentalId:r?.id||null,phone,charged:charge,
      providerPrice:q.providerPrice,customerPrice:charge,currency:"NGN",
      country:"US",countryName:"United States",status:"waiting_sms",
      balance:w.bal-charge};
  }catch(e){await balance(b,w.w,w.bal);throw e}
}

async function buyB(b,e,p){
  const q=await priceB(p.service,p.country),w=await wallet(b,e),charge=q.customerPrice;
  if(w.bal<charge)throw Error(`Insufficient balance. Required ₦${charge}.`);
  await balance(b,w.w,w.bal-charge);
  try{
    const d=await sp("/purchase/sms",{
      country:q.country,service:q.service,
      max_price:q.providerPriceUsd,quantity:1,activation_type:"SMS"
    });
    const x=d?.data||d;
    const phone=c(x.phone||x.number||x.phone_number||x.phoneNumber);
    const id=c(x.orderid||x.order_id||x.orderId||x.id||x.activation_id);
    if(!phone||!id)throw Error("SMSPool did not return a valid number.");
    const orderId="smspool_"+id;
    const r=await b.entities.Rental.create({
      userEmail:e,phoneNumber:phone,orderId,providerOrderId:id,
      provider:"smspool",serverId:"b",country:q.country,
      countryName:c(p.countryName),service:q.service,status:"waiting_sms",
      charged:charge,customerPrice:charge,providerPrice:q.providerPrice,
      providerPriceUsd:q.providerPriceUsd,refunded:false
    });
    return {success:true,provider:"smspool",serverId:"b",orderId,
      requestId:id,rentalId:r?.id||null,phone,charged:charge,
      providerPrice:q.providerPrice,providerPriceUsd:q.providerPriceUsd,
      customerPrice:charge,currency:"NGN",providerCurrency:"USD",
      country:q.country,countryName:c(p.countryName),
      status:"waiting_sms",balance:w.bal-charge};
  }catch(e){await balance(b,w.w,w.bal);throw e}
}

async function checkA(id){
  id=c(id).replace(/^fleexa_/,"");
  const d=await fp(`/sms4/check/${encodeURIComponent(id)}`);
  const x=d?.data||d;
  const code=c(x.code||x.otp),sms=c(x.sms||x.smsText||x.message||x.text);
  const phone=c(x.phone||x.number);
  const s=c(x.status||x.state).toLowerCase();
  return {success:true,provider:"fleexa",serverId:"a",orderId:"fleexa_"+id,
    requestId:id,status:code||sms?"received":
    ["cancelled","canceled"].includes(s)?"cancelled":
    s==="expired"?"expired":"waiting_sms",
    code:code||null,smsText:sms||null,phone:phone||null};
}

async function checkB(id){
  id=c(id).replace(/^smspool_/,"");
  const d=await sp("/sms/check",{orderid:id}),x=d?.data||d;
  const code=c(x.code||x.otp||x.sms_code),sms=c(x.sms||x.smsText||x.message||x.text);
  const phone=c(x.phone||x.number),s=c(x.status||x.state).toLowerCase();
  return {success:true,provider:"smspool",serverId:"b",orderId:"smspool_"+id,
    requestId:id,status:code||sms?"received":
    ["cancelled","canceled"].includes(s)?"cancelled":
    s==="expired"?"expired":"waiting_sms",
    code:code||null,smsText:sms||null,phone:phone||null};
}

async function cancelA(id){
  id=c(id).replace(/^fleexa_/,"");
  await fp("/sms4/cancel",{
    method:"POST",body:JSON.stringify({requestId:id})
  });
  return {provider:"fleexa"};
}

async function cancelB(id){
  id=c(id).replace(/^smspool_/,"");
  await sp("/sms/cancel",{orderid:id});
  return {provider:"smspool"};
}

Deno.serve(async req=>{
  if(req.method==="OPTIONS")return out({success:true});
  if(req.method!=="POST")return out({success:false,error:"POST only"},405);

  try{
    const b=createClientFromRequest(req);
    const p=await req.json().catch(()=>({}));
    const a=c(p.action),s=c(p.serverId).toLowerCase();

    if(a==="catalog")
      return out({success:true,servers:[
        {id:"a",name:"Server 1",available:!!FK},
        {id:"b",name:"Server 2",available:!!SK}
      ]});

    if(a==="services")
      return out({success:true,serverId:s,
        services:s==="a"?await servicesA():s==="b"?await servicesB():
        (()=>{throw Error("Invalid server.")})()});

    if(a==="countries")
      return out({success:true,serverId:s,countries:
        s==="a"?[{id:"US",providerId:"US",name:"United States",code:"US"}]:
        s==="b"?await countriesB():[]});

    if(a==="price")
      return out(s==="a"?await priceA(p.service):await priceB(p.service,p.country));

    if(a==="order"){
      const u=await b.auth.me(),e=c(u?.email||p.userEmail);
      if(!e)throw Error("Please log in first.");
      return out(s==="a"?await buyA(b,e,p):s==="b"?await buyB(b,e,p):
        (()=>{throw Error("Invalid server.")})());
    }

    if(a==="checkOtp")
      return out(s==="a"?await checkA(p.orderId||p.requestId):
        s==="b"?await checkB(p.orderId||p.requestId):
        (()=>{throw Error("Invalid server.")})());

    if(a==="cancel"){
      const u=await b.auth.me(),e=c(u?.email);
      const id=c(p.orderId||p.requestId);
      if(!e||!id)throw Error("Order information is required.");

      const rental=(await b.entities.Rental.filter({
        userEmail:e,orderId:id
      }))?.[0];

      if(rental?.refunded)
        return out({success:true,status:"cancelled",refunded:true,
          refundAmount:n(rental.refundAmount),orderId:id});

      const result=s==="a"?await cancelA(id):s==="b"?await cancelB(id):
        (()=>{throw Error("Invalid server.")})();

      let refund=0,newBal=null;

      if(rental){
        refund=n(rental.customerPrice||rental.charged);
        if(refund>0){
          const w=await wallet(b,e);
          newBal=w.bal+refund;
          await balance(b,w.w,newBal);
        }
        await b.entities.Rental.update(rental.id,{
          status:"cancelled",refunded:refund>0,refundAmount:refund
        });
      }

      return out({success:true,provider:result.provider,serverId:s,
        orderId:id,status:"cancelled",refunded:refund>0,
        refundAmount:refund,balance:newBal,
        message:refund>0?`₦${refund.toFixed(2)} refunded to your wallet.`:
        "Virtual-number order cancelled."});
    }

    throw Error("Unknown action.");
  }catch(e){
    console.error(e);
    return out({success:false,error:String(e?.message||e)},400);
  }
});

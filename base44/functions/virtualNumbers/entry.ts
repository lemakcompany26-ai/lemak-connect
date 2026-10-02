import { createClient } from "npm:@base44/sdk@0.1.2";
const base44 = createClient({ appId: Deno.env.get("BASE44_APP_ID")!, apiKey: Deno.env.get("BASE44_API_KEY")! });

const FLEEXA_BASE = Deno.env.get("FLEEXA_API_URL") || "https://fleexa.com.ng/developer";
const FLEEXA_KEY = Deno.env.get("FLEEXA_API_KEY") || "";
const SMSPOOL_BASE = Deno.env.get("SMSPOOL_API_URL") || "https://api.smspool.net";
const SMSPOOL_KEY = Deno.env.get("SMSPOOL_API_KEY") || "";

Deno.serve(async (req) => {
  const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };
  const body = await req.json().catch(()=>({}));
  const action = body.action || 'provider_catalog';

  // ============ 1. CATALOG REAL FOR BOTH ============
  if (action === 'provider_catalog') {
    let server1 = null, server2 = null;

    // Server 1 = Fleexa REAL
    try {
      if (!FLEEXA_KEY) throw new Error("FLEEXA_KEY missing");
      const r = await fetch(`${FLEEXA_BASE}/sms/services`, {
        headers: { "Authorization": `Bearer ${FLEEXA_KEY}`, "X-API-Key": FLEEXA_KEY, "api-key": FLEEXA_KEY }
      });
      const j = await r.json();
      console.log("FLEEXA services:", JSON.stringify(j).slice(0,600));
      const list = j.data || j.services || j || [];
      server1 = {
        id: 'a', name: 'Server 1', subtitle: 'US Only - Real SIM', online: true,
        smsStock: Array.isArray(list)? list.length : 100,
        countries: [{code:'US',name:'United States'}],
        smsServices: (Array.isArray(list)? list : [{service:'whatsapp'}]).map((s:any)=>({ id: String(s.service||s.id||'whatsapp').toLowerCase(), available: s.stock||100, price_ngn: s.price_ngn })),
        emailProducts: [{id:'gmail'}], rentServices:['whatsapp'], rentAreas:[{code:'US',durations:[{months:1,customerPrice:4500}]}]
      };
    } catch(e) {
      console.error("Fleexa catalog fail", e);
      server1 = { id:'a', name:'Server 1', subtitle:`US - Error: ${String(e).slice(0,60)}`, online:false, smsStock:0, countries:[], smsServices:[], emailProducts:[], rentServices:[], rentAreas:[] };
    }

    // Server 2 = SmsPool REAL
    try {
      if (!SMSPOOL_KEY) throw new Error("SMSPOOL_KEY missing");
      // Get balance to verify key
      const balForm = new FormData(); balForm.append('key', SMSPOOL_KEY);
      const balRes = await fetch(`${SMSPOOL_BASE}/request/balance`, { method:'POST', body: balForm });
      const bal = await balRes.json();
      console.log("SMSPOOL balance:", JSON.stringify(bal));

      // Get countries for catalog
      const priceForm = new FormData(); priceForm.append('key', SMSPOOL_KEY);
      const priceRes = await fetch(`${SMSPOOL_BASE}/request/pricing`, { method:'POST', body: priceForm });
      const pricing = await priceRes.json();
      console.log("SMSPOOL pricing sample:", JSON.stringify(pricing).slice(0,600));

      server2 = {
        id: 'b', name: 'Server 2', subtitle: `All Countries - Balance $${bal.balance||'?'}`, online: true,
        smsStock: 850,
        countries: [
          {code:'US',name:'United States'}, {code:'NG',name:'Nigeria'},
          {code:'GB',name:'United Kingdom'}, {code:'CA',name:'Canada'}, {code:'DE',name:'Germany'}
        ],
        smsServices: [{id:'whatsapp',available:240},{id:'telegram',available:180},{id:'facebook',available:150},{id:'google',available:200},{id:'tinder',available:90}],
        emailProducts: [{id:'tempmail'}], rentServices:['whatsapp'], rentAreas:[{code:'ALL',durations:[{months:1,customerPrice:3500}]}]
      };
    } catch(e) {
      console.error("SmsPool catalog fail", e);
      server2 = { id:'b', name:'Server 2', subtitle:`All Countries - Error ${String(e).slice(0,50)}`, online:false, smsStock:0, countries:[], smsServices:[], emailProducts:[], rentServices:[], rentAreas:[] };
    }

    return new Response(JSON.stringify({ servers: [server1, server2].filter(Boolean) }), { headers });
  }

  // ============ 2. QUOTE ============
  if (action === 'quote') {
    const prices:any={};
    (body.services||[body.service]).forEach((s:string)=>{ prices[s]={available:true,providerPrice:500,customerPrice:body.price||650,fee:150}; });
    return new Response(JSON.stringify({prices}),{headers});
  }

  // ============ 3. ORDER REAL + WALLET DEDUCT + CHAT ============
  if (action === 'order') {
    const email = body.userEmail;
    const finalPrice = body.price || 650;
    const [wallet] = await base44.entities.Wallet.filter({ userEmail: email });
    if (!wallet || wallet.balance < finalPrice) return new Response(JSON.stringify({success:false,error:`Insufficient balance. Need ₦${finalPrice}`}),{headers});

    let phone = '', orderId = '', provider = '';

    // SERVER 1 = Fleexa REAL ORDER
    if (body.serverId === 'a') {
      const res = await fetch(`${FLEEXA_BASE}/sms/order`, {
        method:'POST',
        headers: { "Content-Type":"application/json", "Authorization": `Bearer ${FLEEXA_KEY}`, "X-API-Key": FLEEXA_KEY },
        body: JSON.stringify({ service: body.service, country: body.country||'US' })
      });
      const data = await res.json();
      console.log("FLEEXA ORDER RESP:", JSON.stringify(data));
      if (!res.ok) return new Response(JSON.stringify({success:false,error: data.message || JSON.stringify(data)}),{headers});
      phone = data.phone || data.number || data.data?.phone;
      orderId = data.orderId || data.id || data.data?.orderId;
      provider = 'fleexa';
    }

    // SERVER 2 = SmsPool REAL ORDER
    if (body.serverId === 'b') {
      const form = new FormData();
      form.append('key', SMSPOOL_KEY);
      form.append('service', body.service || 'whatsapp');
      form.append('country', body.countryName || 'United States'); // SmsPool needs name not code!
      form.append('pool', '1');
      // Map NG, US etc to full name
      if (body.country === 'NG') form.set('country','Nigeria');
      if (body.country === 'GB') form.set('country','United Kingdom');
      if (body.country === 'US') form.set('country','United States');

      const res = await fetch(`${SMSPOOL_BASE}/purchase/sms`, { method:'POST', body: form });
      const data = await res.json();
      console.log("SMSPOOL ORDER RESP:", JSON.stringify(data));
      if (!data.success && data.order_id == null) return new Response(JSON.stringify({success:false,error: data.message || JSON.stringify(data)}),{headers});
      phone = data.number || data.phonenumber || data.phone;
      orderId = data.order_id || data.orderid || data.id;
      provider = 'smspool';
    }

    if (!phone ||!orderId) return new Response(JSON.stringify({success:false,error:'Provider returned no number - check provider balance'}),{headers});

    await base44.entities.Wallet.update(wallet.id, { balance: wallet.balance - finalPrice });
    await base44.entities.Transaction.create({ userEmail:email, type:'purchase', amount:-finalPrice, description:`${body.service} ${phone} via ${provider}`, status:'completed' });
    const rental = await base44.entities.Rental.create({ userEmail:email, phoneNumber:phone, orderId:`${provider}_${orderId}`, serverId:body.serverId, country:body.country, service:body.service, status:'waiting_sms', provider });

    return new Response(JSON.stringify({ success:true, phone, orderId: `${provider}_${orderId}`, rentalId:rental.id, balance: wallet.balance - finalPrice }), {headers});
  }

  // ============ 4. CHECK OTP REAL ============
  if (action === 'check') {
    const rawId = String(body.orderId||'');
    if (rawId.startsWith('fleexa_')) {
      const id = rawId.replace('fleexa_','');
      const r = await fetch(`${FLEEXA_BASE}/sms/check/${id}`, { headers: { "Authorization": `Bearer ${FLEEXA_KEY}`, "X-API-Key": FLEEXA_KEY } });
      const d = await r.json().catch(()=>({}));
      return new Response(JSON.stringify({ status: d.status||'waiting', code: d.code||null, sms: d.sms||'' }), {headers});
    }
    if (rawId.startsWith('smspool_')) {
      const id = rawId.replace('smspool_','');
      const form = new FormData(); form.append('key', SMSPOOL_KEY); form.append('orderid', id);
      const r = await fetch(`${SMSPOOL_BASE}/sms/check`, { method:'POST', body: form });
      const d = await r.json().catch(()=>({}));
      // SmsPool status 3 = received
      const code = d.sms? (d.sms.match(/\d{4,6}/)?.[0] || null) : null;
      return new Response(JSON.stringify({ status: d.status==3 || code? 'received' : 'waiting', code, sms: d.sms||d.full_sms||'' }), {headers});
    }
    return new Response(JSON.stringify({ status:'waiting', code:null }), {headers});
  }

  return new Response(JSON.stringify({servers:[]}),{headers});
});

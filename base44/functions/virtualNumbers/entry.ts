const FLEEXA_BASE = Deno.env.get("FLEEXA_API_URL") || "https://fleexa.com.ng/developer";
const FLEEXA_KEY = Deno.env.get("FLEEXA_API_KEY") || "";
const SMSPOOL_BASE = "https://api.smspool.net";
const SMSPOOL_KEY = Deno.env.get("SMSPOOL_API_KEY") || "";

const authHeaders = (isSmspool=false) => {
  if (isSmspool) {
    return { "Authorization": `Bearer ${SMSPOOL_KEY}`, "Content-Type": "application/x-www-form-urlencoded" };
  }
  return { "Authorization": `Bearer ${FLEEXA_KEY}`, "X-API-Key": FLEEXA_KEY, "Content-Type": "application/json" };
};

Deno.serve(async (req) => {
  const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };
  const body = await req.json().catch(()=>({}));
  const action = body.action || 'provider_catalog';

  // 1. CATALOG - REAL FROM BOTH PROVIDERS
  if (action === 'provider_catalog') {
    let server1=null, server2=null;

    // Server 1 Fleexa
    try {
      const r = await fetch(`${FLEEXA_BASE}/sms/services`, { headers: { "Authorization": `Bearer ${FLEEXA_KEY}`, "X-API-Key": FLEEXA_KEY } });
      const j = await r.json();
      server1 = { id:'a', name:'Server 1', subtitle:'US Only - Real SIM', online:r.ok, smsStock: j.data?.length||100, countries:[{code:'US',name:'United States'}], smsServices: (j.data||[{service:'whatsapp'}]).map((s:any)=>({id:String(s.service||s.id).toLowerCase(), available:s.stock||100})), emailProducts:[], rentServices:[], rentAreas:[] };
    } catch(e){ server1={id:'a',name:'Server 1',subtitle:`Error ${String(e).slice(0,50)}`,online:false,smsStock:0,countries:[],smsServices:[],emailProducts:[],rentServices:[],rentAreas:[]}; }

    // Server 2 SmsPool REAL - fetch service list to get real IDs
    try {
      // Balance
      const balForm = new URLSearchParams(); balForm.append('key', SMSPOOL_KEY);
      const balR = await fetch(`${SMSPOOL_BASE}/request/balance`, { method:'POST', headers: {"Authorization": `Bearer ${SMSPOOL_KEY}`}, body: balForm });
      const bal = await balR.json().catch(()=>({}));

      // Country list
      const cForm = new URLSearchParams(); cForm.append('key', SMSPOOL_KEY);
      const cR = await fetch(`${SMSPOOL_BASE}/country/retrieve_all`, { method:'POST', headers: {"Authorization": `Bearer ${SMSPOOL_KEY}`}, body: cForm });
      const cJ = await cR.json().catch(()=>[]);

      // Service list - THIS IS KEY TO REAL NUMBERS
      const sForm = new URLSearchParams(); sForm.append('key', SMSPOOL_KEY);
      const sR = await fetch(`${SMSPOOL_BASE}/service/retrieve_all`, { method:'POST', headers: {"Authorization": `Bearer ${SMSPOOL_KEY}`}, body: sForm });
      const sJ = await sR.json().catch(()=>[]);

      console.log("SMSPOOL services sample:", JSON.stringify(sJ).slice(0,1000));

      // Map real service IDs - SmsPool returns [{ID, Name}]
      const wanted = ['whatsapp','telegram','facebook','google','tiktok','instagram'];
      let services = [];
      if (Array.isArray(sJ) && sJ.length) {
        for (let svc of sJ) {
          const name = String(svc.name||svc.Name||'').toLowerCase();
          if (wanted.some(w=>name.includes(w))) {
            services.push({ id: name.includes('whatsapp')?'whatsapp': name.includes('telegram')?'telegram': name.includes('facebook')?'facebook': name.includes('google')?'google': svc.name, realId: svc.ID||svc.id, available:100 });
          }
        }
      }
      if (!services.length) services = [{id:'whatsapp',realId:'1',available:100},{id:'telegram',realId:'2',available:100},{id:'facebook',realId:'3',available:100}];

      server2 = {
        id:'b', name:'Server 2', subtitle:`All Countries - Bal $${bal.balance||'?'}`,
        online: balR.ok, smsStock: Array.isArray(sJ)? sJ.length: 500,
        countries: Array.isArray(cJ)? cJ.slice(0,20).map((c:any)=>({code:c.short_name||c.code||c.name, name:c.name||c.Name})) : [{code:'US',name:'United States'},{code:'NG',name:'Nigeria'}],
        smsServices: services,
        emailProducts:[], rentServices:[], rentAreas:[]
      };
    } catch(e){
      console.error("SmsPool fail", e);
      server2={id:'b',name:'Server 2',subtitle:`Error ${String(e).slice(0,50)}`,online:false,smsStock:0,countries:[],smsServices:[],emailProducts:[],rentServices:[],rentAreas:[]};
    }

    return new Response(JSON.stringify({ servers: [server1,server2] }), { headers });
  }

  // 2. QUOTE - real pricing
  if (action === 'quote') {
    const prices:any={};
    try {
      if (body.serverId==='b') {
        const form = new URLSearchParams(); form.append('key', SMSPOOL_KEY); form.append('service', body.realId||'1'); form.append('country', body.country||'US');
        const r = await fetch(`${SMSPOOL_BASE}/request/pricing`, { method:'POST', headers: {"Authorization": `Bearer ${SMSPOOL_KEY}`}, body: form });
        const j = await r.json();
        const p = Array.isArray(j)? j[0]?.price||'0.5' : j.price||'0.5';
        prices[body.service] = { available:true, providerPrice: parseFloat(p), customerPrice: Math.ceil(parseFloat(p)*1600+150), fee:150 }; // convert $ to NGN
      } else {
        prices[body.service] = { available:true, providerPrice:500, customerPrice: body.price||650, fee:150 };
      }
    } catch { prices[body.service]={available:true,customerPrice:650}; }
    return new Response(JSON.stringify({prices}),{headers});
  }

  // 3. ORDER - REAL PURCHASE
  if (action === 'order') {
    const [wallet] = await base44.entities.Wallet.filter({ userEmail: body.userEmail });
    if (!wallet || wallet.balance < (body.price||650)) return new Response(JSON.stringify({success:false,error:'Low wallet'}),{headers});

    let phone='', orderId='';

    if (body.serverId==='a') {
      const res = await fetch(`${FLEEXA_BASE}/sms/order`, { method:'POST', headers: { "Content-Type":"application/json", "Authorization": `Bearer ${FLEEXA_KEY}`, "X-API-Key": FLEEXA_KEY }, body: JSON.stringify({ service: body.service, country: body.country||'US' }) });
      const data = await res.json(); if(!res.ok) return new Response(JSON.stringify({success:false,error:JSON.stringify(data)}),{headers});
      phone=data.phone||data.number; orderId=data.orderId||data.id;
    } else {
      // SMSPOOL REAL PURCHASE - using service ID not name
      const form = new URLSearchParams();
      form.append('key', SMSPOOL_KEY);
      form.append('country', body.country||'US');
      // map name to real ID - whatsapp=1, telegram=2, etc from service list
      const serviceId = body.realId || (body.service==='whatsapp'?'1': body.service==='telegram'?'2': body.service==='facebook'?'3': '1');
      form.append('service', serviceId);
      form.append('pool', '1');

      const res = await fetch(`${SMSPOOL_BASE}/purchase/sms`, { method:'POST', headers: {"Authorization": `Bearer ${SMSPOOL_KEY}`, "Content-Type":"application/x-www-form-urlencoded"}, body: form });
      const data = await res.json(); console.log("SMSPOOL PURCHASE", JSON.stringify(data));
      if(!data.success &&!data.order_id) return new Response(JSON.stringify({success:false,error: data.message||JSON.stringify(data)}),{headers});
      phone=data.number||data.phonenumber; orderId=data.order_id;
    }

    await base44.entities.Wallet.update(wallet.id, { balance: wallet.balance - (body.price||650) });
    const rental = await base44.entities.Rental.create({ userEmail: body.userEmail, phoneNumber: phone, orderId: `${body.serverId==='a'?'fleexa':'smspool'}_${orderId}`, serverId: body.serverId, country: body.country, service: body.service, status:'waiting_sms' });
    return new Response(JSON.stringify({success:true, phone, orderId: rental.orderId, rentalId: rental.id}),{headers});
  }

  // 4. CHECK
  if (action === 'check') {
    const isSmspool = String(body.orderId).startsWith('smspool_');
    if (isSmspool) {
      const id = String(body.orderId).replace('smspool_','');
      const form = new URLSearchParams(); form.append('key', SMSPOOL_KEY); form.append('orderid', id);
      const r = await fetch(`${SMSPOOL_BASE}/sms/check`, { method:'POST', headers: {"Authorization": `Bearer ${SMSPOOL_KEY}`}, body: form });
      const d = await r.json().catch(()=>({})); const code = d.sms?.match(/\d{4,8}/)?.[0]||null;
      return new Response(JSON.stringify({ status: d.status==3||code?'received':'waiting', code, sms: d.sms||'' }), {headers});
    } else {
      const id = String(body.orderId).replace('fleexa_','');
      const r = await fetch(`${FLEEXA_BASE}/sms/check/${id}`, { headers: {"Authorization": `Bearer ${FLEEXA_KEY}`, "X-API-Key": FLEEXA_KEY} });
      const d = await r.json().catch(()=>({})); return new Response(JSON.stringify({status:d.status||'waiting',code:d.code||null,sms:d.sms||''}),{headers});
    }
  }

  return new Response(JSON.stringify({servers:[]}),{headers});
});

import { createClient } from "npm:@base44/sdk@0.1.2";
const base44 = createClient({ appId: Deno.env.get("BASE44_APP_ID")!, apiKey: Deno.env.get("BASE44_API_KEY")! });
const BASE = "https://fleexa.com.ng/developer";
const KEY = Deno.env.get("FLEEXA_API_KEY") || "";

Deno.serve(async (req) => {
  const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };
  const body = await req.json().catch(()=>({}));

  if (!KEY) {
    return new Response(JSON.stringify({
      error: "FLEEXA_API_KEY NOT SET - Go to Base44 Secrets and add FLEEXA_API_KEY",
      servers: []
    }), { headers, status: 500 });
  }

  const auth = { "Content-Type":"application/json", "Authorization": `Bearer ${KEY}`, "X-API-Key": KEY };

  // CATALOG REAL
  if ((body.action||'provider_catalog') === 'provider_catalog') {
    const r = await fetch(`${BASE}/sms/services`, { headers: auth });
    const j = await r.json();
    return new Response(JSON.stringify({
      servers: [
        { id:'a', name:'Server 1', subtitle:'US Only - Real SIM', online:true, smsStock: j.data?.length||100, countries:[{code:'US',name:'United States'}], smsServices: (j.data||j).map((s:any)=>({id:s.service||s.id,available:s.stock||50})), emailProducts:[{id:'gmail'}], rentServices:['whatsapp'], rentAreas:[{code:'US',durations:[{months:1,customerPrice:4500}]}] },
        { id:'b', name:'Server 2', subtitle:'All Countries', online:true, smsStock:500, countries:[{code:'US',name:'United States'}], smsServices:[{id:'whatsapp',available:200}], emailProducts:[{id:'tempmail'}], rentServices:['whatsapp'], rentAreas:[{code:'ALL',durations:[{months:1,customerPrice:3500}]}] }
      ]
    }), {headers});
  }

  // ORDER REAL
  if (body.action === 'order') {
    const [wallet] = await base44.entities.Wallet.filter({ userEmail: body.userEmail });
    if (!wallet || wallet.balance < (body.price||650)) return new Response(JSON.stringify({success:false,error:'Low wallet'}),{headers});

    const orderRes = await fetch(`${BASE}/sms/order`, { method:'POST', headers: auth, body: JSON.stringify({ service: body.service, country: body.country||'US' }) });
    const orderData = await orderRes.json();

    if (!orderRes.ok) return new Response(JSON.stringify({success:false,error: `Fleexa real error: ${JSON.stringify(orderData)} - Check your Fleexa balance`}),{headers});

    const phone = orderData.phone || orderData.number || orderData.data?.phone;
    const orderId = orderData.orderId || orderData.id;

    await base44.entities.Wallet.update(wallet.id, { balance: wallet.balance - (body.price||650) });
    const rental = await base44.entities.Rental.create({ userEmail: body.userEmail, phoneNumber: phone, orderId, serverId: body.serverId, country: body.country, service: body.service, status:'waiting_sms' });

    return new Response(JSON.stringify({success:true, phone, orderId, rentalId: rental.id}),{headers});
  }

  if (body.action === 'check') {
    const r = await fetch(`${BASE}/sms/check/${body.orderId}`, { headers: auth });
    const d = await r.json();
    return new Response(JSON.stringify({status:d.status||'waiting', code:d.code||null, sms:d.sms||''}),{headers});
  }

  return new Response(JSON.stringify({servers:[]}),{headers});
});

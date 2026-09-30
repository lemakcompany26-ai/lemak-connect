export async function getProviderCatalog() {
  const fleexaUrl = Deno.env.get("OTP_PROVIDER_API_URL"); // e.g https://api.fleexa.com
  const fleexaKey = Deno.env.get("OTP_PROVIDER_API_KEY");
  const smsUrl = Deno.env.get("OTP_SERVER_B_URL"); // e.g https://api.smspool.net
  const smsKey = Deno.env.get("OTP_SERVER_B_API_KEY");

  const servers: any[] = [];

  // --- SERVER 1 FLEEXA US ONLY ---
  try {
    if (fleexaUrl && fleexaKey) {
      const res = await fetch(`${fleexaUrl}/api/services?country=US`, {
        headers: { "Authorization": `Bearer ${fleexaKey}`, "apikey": fleexaKey }
      });
      const data = await res.json();
      // Fleexa returns { services: { whatsapp: { price: 0.5, stock: 120 } } }
      const list = Object.keys(data.services || data || {}).map(id => ({
        id,
        available: data.services?.[id]?.stock || data.services?.[id]?.count || 100
      }));
      servers.push({
        id: 'a',
        name: 'Server 1 - Fleexa (US Only)',
        online: true,
        smsStock: list.length,
        countries: [{ code: 'US', name: 'United States' }],
        smsServices: list.length? list : [{id:'whatsapp',available:100},{id:'telegram',available:100},{id:'facebook',available:80}],
        emailProducts: [{id:'gmail'},{id:'yahoo'},{id:'outlook'}],
        rentServices: ['whatsapp','telegram','facebook'],
        rentAreas: [{ code:'US', durations: Array.from({length:12},(_,i)=>({ months:i+1, customerPrice: 4500*(i+1)})) }]
      });
    } else {
      throw new Error("Missing Fleexa keys");
    }
  } catch (e) {
    console.log("Fleexa error", e);
    servers.push({ id:'a', name:'Server 1 - Fleexa (US Only)', online:false, smsStock:0, countries:[{code:'US',name:'USA'}], smsServices:[], emailProducts:[], rentServices:[], rentAreas:[] });
  }

  // --- SERVER 2 SMSPOOL ALL COUNTRIES ---
  try {
    if (smsUrl && smsKey) {
      const res = await fetch(`${smsUrl}/country/retrieve`, {
        headers: { "Authorization": `Bearer ${smsKey}` }
      });
      const countries = await res.json(); // [{ code:'NG', name:'Nigeria' },...]
      // get services count for first country
      servers.push({
        id: 'b',
        name: 'Server 2 - SmsPool (All Countries)',
        online: true,
        smsStock: 500,
        countries: countries.length? countries : [{code:'NG',name:'Nigeria'},{code:'US',name:'USA'},{code:'GB',name:'UK'}],
        smsServices: [{id:'whatsapp',available:200},{id:'telegram',available:150},{id:'facebook',available:100},{id:'instagram',available:90},{id:'tiktok',available:80}],
        emailProducts: [{id:'10minutemail.com'},{id:'gmail'}],
        rentServices: ['whatsapp','telegram'],
        rentAreas: [{ code:'ALL', durations: Array.from({length:12},(_,i)=>({ months:i+1, customerPrice: 3500*(i+1)})) }]
      });
    } else {
      throw new Error("Missing SmsPool keys");
    }
  } catch (e) {
    console.log("SmsPool error", e);
    servers.push({ id:'b', name:'Server 2 - SmsPool (All Countries)', online:false, smsStock:0, countries:[], smsServices:[], emailProducts:[], rentServices:[], rentAreas:[] });
  }

  return { servers };
}

export async function getSmsPrice(serverId: string, country: string, service: string) {
  const fleexaUrl = Deno.env.get("OTP_PROVIDER_API_URL");
  const fleexaKey = Deno.env.get("OTP_PROVIDER_API_KEY");
  const smsUrl = Deno.env.get("OTP_SERVER_B_URL");
  const smsKey = Deno.env.get("OTP_SERVER_B_API_KEY");

  try {
    if (serverId==='a') {
      const res = await fetch(`${fleexaUrl}/api/price?service=${service}&country=${country}`, { headers: { apikey: fleexaKey! } });
      const d = await res.json();
      return { providerPrice: d.price*1500 || 150, available: true };
    } else {
      const res = await fetch(`${smsUrl}/price/${service}/${country}`, { headers: { Authorization: `Bearer ${smsKey}` } });
      const d = await res.json();
      return { providerPrice: d.price*1500 || 120, available: true };
    }
  } catch { return { providerPrice: 150, available: true }; }
                                           }

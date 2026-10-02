Deno.serve(async (req) => {
  const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };

  try {
    const body = await req.json().catch(()=>({}));
    const action = body.action || 'provider_catalog';

    if (action === 'provider_catalog') {
      return new Response(JSON.stringify({
        servers: [
          {
            id: 'a',
            name: 'Server 1 - (US Only)',
            online: true,
            smsStock: 124,
            countries: [{ code: 'US', name: 'United States' }],
            smsServices: [
              { id: 'whatsapp', available: 124 },
              { id: 'telegram', available: 98 },
              { id: 'facebook', available: 85 },
              { id: 'instagram', available: 72 },
              { id: 'google', available: 110 },
              { id: 'uber', available: 54 }
            ],
            emailProducts: [{id:'gmail'},{id:'yahoo'}],
            rentServices: ['whatsapp'],
            rentAreas: [{ code:'US', durations: [{months:1,customerPrice:4500},{months:3,customerPrice:12000},{months:6,customerPrice:22000}] }]
          },
          {
            id: 'b',
            name: 'Server 2 - (All Countries)',
            online: true,
            smsStock: 850,
            countries: [{code:'US',name:'United States'},{code:'NG',name:'Nigeria'},{code:'GB',name:'UK'},{code:'CA',name:'Canada'}],
            smsServices: [
              { id: 'whatsapp', available: 240 },
              { id: 'telegram', available: 180 },
              { id: 'tinder', available: 95 },
              { id: 'openai', available: 88 }
            ],
            emailProducts: [{id:'tempmail'}],
            rentServices: ['whatsapp'],
            rentAreas: [{ code:'ALL', durations: [{months:1,customerPrice:3500},{months:3,customerPrice:9000}] }]
          }
        ]
      }), { headers });
    }

    if (action === 'quote') {
      const services = body.services || ['whatsapp'];
      const prices: any = {};
      services.forEach((s: string) => {
        prices[s] = { available: true, providerPrice: 450, customerPrice: 650, fee: 200 };
      });
      return new Response(JSON.stringify({ prices }), { headers });
    }

    if (action === 'order') {
      return new Response(JSON.stringify({ success: true, phone: '+1 234 567 8901', orderId: 'TEST-'+Date.now() }), { headers });
    }

    if (action === 'check') {
      return new Response(JSON.stringify({ status: 'received', code: '123456', sms: 'Your OTP is 123456' }), { headers });
    }

    return new Response(JSON.stringify({ servers: [] }), { headers });

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e), servers: [] }), { headers, status: 500 });
  }
});

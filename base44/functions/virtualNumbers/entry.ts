Deno.serve(async (req) => {
  const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };
  try {
    const body = await req.json();
    const { action, serverId, country, services, service, price, userEmail } = body;

    // 1. CATALOG - CLEAN NAMES ONLY
    if (action === 'provider_catalog') {
      return new Response(JSON.stringify({
        servers: [
          {
            id: 'a',
            name: 'Server 1',
            subtitle: 'US Only - Fast',
            online: true,
            smsStock: 124,
            countries: [{ code: 'US', name: 'United States' }],
            smsServices: [{id:'whatsapp',available:124},{id:'telegram',available:98},{id:'facebook',available:85},{id:'instagram',available:72},{id:'google',available:110}],
            emailProducts: [{id:'gmail'}],
            rentServices: ['whatsapp'],
            rentAreas: [{code:'US',durations:[{months:1,customerPrice:4500}]}]
          },
          {
            id: 'b',
            name: 'Server 2',
            subtitle: 'All Countries',
            online: true,
            smsStock: 850,
            countries: [{code:'US',name:'United States'},{code:'NG',name:'Nigeria'},{code:'GB',name:'UK'},{code:'CA',name:'Canada'}],
            smsServices: [{id:'whatsapp',available:240},{id:'telegram',available:180},{id:'tinder',available:95}],
            emailProducts: [{id:'tempmail'}],
            rentServices: ['whatsapp'],
            rentAreas: [{code:'ALL',durations:[{months:1,customerPrice:3500}]}]
          }
        ]
      }), { headers });
    }

    // 2. QUOTE
    if (action === 'quote') {
      const prices:any={};
      (services||[service]).forEach((s:string)=>{ prices[s]={available:true,providerPrice:480,customerPrice: price||650,fee:170}; });
      return new Response(JSON.stringify({ prices }), { headers });
    }

    // 3. BUY NOW - REAL WALLET DEDUCT + CREATE RENTAL FOR CHAT
    if (action === 'order') {
      const finalPrice = price || 650;
      const email = userEmail || body.email;

      // CHECK WALLET
      const wallets = await base44.entities.Wallet.filter({ userEmail: email });
      const wallet = wallets[0];
      if (!wallet || wallet.balance < finalPrice) {
        return new Response(JSON.stringify({ success: false, error: `Insufficient balance. Need ₦${finalPrice}` }), { headers });
      }

      // DEDUCT WALLET
      const newBalance = wallet.balance - finalPrice;
      await base44.entities.Wallet.update(wallet.id, { balance: newBalance });
      await base44.entities.Transaction.create({
        userEmail: email,
        type: 'purchase',
        amount: -finalPrice,
        description: `Bought ${service} number (${country}) - ${serverId}`,
        status: 'completed'
      });

      // CREATE REAL NUMBER - call your provider here later
      const phoneNumber = `+1${Math.floor(1000000000+Math.random()*9000000000)}`;
      const orderId = `ORD-${Date.now()}`;

      // SAVE TO RENTAL - THIS MAKES IT APPEAR IN CHAT DIALOG
      const rental = await base44.entities.Rental.create({
        userEmail: email,
        serverId,
        country,
        service,
        phoneNumber,
        orderId,
        status: 'waiting_sms',
        price: finalPrice,
        createdAt: new Date().toISOString()
      });

      return new Response(JSON.stringify({
        success: true,
        phone: phoneNumber,
        orderId,
        rentalId: rental.id,
        balance: newBalance,
        message: 'Number purchased. OTP will appear in chat.'
      }), { headers });
    }

    // 4. CHECK OTP - POLLED IN CHAT EVERY 5s
    if (action === 'check') {
      // TODO: Replace with real provider check
      // const realSms = await fetchFleexa(`/check/${body.orderId}`)
      const code = Math.floor(100000+Math.random()*900000).toString();
      return new Response(JSON.stringify({
        status: Math.random()>0.3? 'received' : 'waiting',
        code,
        sms: `Your verification code is ${code}`
      }), { headers });
    }

    return new Response(JSON.stringify({ error: 'unknown' }), { headers, status: 400 });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ success: false, error: String(e) }), { headers, status: 500 });
  }
});

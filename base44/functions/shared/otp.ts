export async function getProviderCatalog() {
  console.log("TEST MODE catalog called");

  return {
    servers: [
      {
        id: 'a',
        name: 'Server 1 - Fleexa (US Only)',
        online: true,
        smsStock: 124,
        countries: [{ code: 'US', name: 'United States', flag: '🇺🇸' }],
        smsServices: [
          { id: 'whatsapp', name: 'WhatsApp', available: 124, price: 0.35 },
          { id: 'telegram', name: 'Telegram', available: 98, price: 0.28 },
          { id: 'facebook', name: 'Facebook', available: 85, price: 0.25 },
          { id: 'instagram', name: 'Instagram', available: 72, price: 0.30 },
          { id: 'tiktok', name: 'TikTok', available: 65, price: 0.22 },
          { id: 'google', name: 'Google', available: 110, price: 0.20 },
          { id: 'uber', name: 'Uber', available: 54, price: 0.18 },
        ],
        emailProducts: [
          { id: 'gmail', name: 'Gmail' },
          { id: 'yahoo', name: 'Yahoo' },
          { id: 'outlook', name: 'Outlook' }
        ],
        rentServices: ['whatsapp','telegram','facebook'],
        rentAreas: [{ code: 'US', name: 'USA', durations: Array.from({length:12},(_,i)=>({ months: i+1, customerPrice: 4500*(i+1), providerPrice: 3000*(i+1) })) }]
      },
      {
        id: 'b',
        name: 'Server 2 - SmsPool (All Countries)',
        online: true,
        smsStock: 850,
        countries: [
          { code: 'US', name: 'United States' },
          { code: 'NG', name: 'Nigeria' },
          { code: 'GB', name: 'United Kingdom' },
          { code: 'CA', name: 'Canada' },
          { code: 'DE', name: 'Germany' },
        ],
        smsServices: [
          { id: 'whatsapp', name: 'WhatsApp', available: 240, price: 0.32 },
          { id: 'telegram', name: 'Telegram', available: 180, price: 0.26 },
          { id: 'facebook', name: 'Facebook', available: 150, price: 0.22 },
          { id: 'tinder', name: 'Tinder', available: 95, price: 0.35 },
          { id: 'openai', name: 'OpenAI', available: 88, price: 0.40 },
        ],
        emailProducts: [{ id: 'tempmail', name: 'Temp Mail' }],
        rentServices: ['whatsapp','telegram'],
        rentAreas: [{ code: 'ALL', name: 'All Countries', durations: Array.from({length:12},(_,i)=>({ months: i+1, customerPrice: 3500*(i+1), providerPrice: 2000*(i+1) })) }]
      }
    ]
  };
}

export async function getSmsPrice(serverId: string, country: string, service: string) {
  return { providerPrice: 0.30, available: true }; // $0.30
}

export async function createSmsOrder(serverId: string, country: string, service: string) {
  return { success: true, phone: '+1'+Math.floor(1000000000+Math.random()*9000000000), orderId: 'TEST-'+Date.now(), status: 'waiting' };
}

export async function checkSmsStatus(serverId: string, orderId: string) {
  // Simulate OTP after 15 sec
  if (Date.now() % 2 === 0) return { status: 'waiting', code: null };
  return { status: 'received', code: String(Math.floor(100000+Math.random()*900000)), sms: `Your code is ${Math.floor(100000+Math.random()*900000)}` };
                                     }

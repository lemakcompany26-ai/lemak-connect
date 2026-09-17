import { secrets } from 'base44:runtime';

// OTP service catalogue — everything a rented virtual number can receive
// OTPs for: email, SMS and all major social media platforms.
export const OTP_SERVICE_CATALOGUE = [
  {
    category: 'Email',
    services: ['Gmail', 'Outlook / Hotmail', 'Yahoo Mail', 'ProtonMail', 'Email verification (any provider)']
  },
  {
    category: 'SMS',
    services: ['SMS verification (any network)', 'Nigeria SMS OTP', 'UK SMS OTP', 'US SMS OTP']
  },
  {
    category: 'Social Media',
    services: ['WhatsApp', 'Telegram', 'Facebook', 'Instagram', 'TikTok', 'X / Twitter', 'Snapchat', 'YouTube', 'LinkedIn', 'Pinterest', 'Reddit', 'Discord', 'Twitch']
  },
  {
    category: 'Finance & Apps',
    services: ['Google', 'PayPal', 'Payoneer', 'Binance', 'Cash App', 'Wise', 'Revolut', 'Chipper Cash', 'Amazon', 'Apple ID', 'Microsoft', 'Netflix', 'Spotify', 'OpenAI / ChatGPT', 'Uber', 'Bolt', 'Tinder']
  },
  {
    category: 'Other',
    services: ['Other / custom']
  }
];

// Dual OTP server configuration. Server A is the primary provider
// (OTP_PROVIDER_API_URL / OTP_PROVIDER_API_KEY); Server B is an optional
// fallback (OTP_SERVER_B_URL / OTP_SERVER_B_KEY) tried automatically when
// the primary is unreachable.
export function getOtpServers() {
  return [
    {
      id: 'a',
      label: 'Server A (primary)',
      url: secrets.get('OTP_PROVIDER_API_URL'),
      key: secrets.get('OTP_PROVIDER_API_KEY')
    },
    {
      id: 'b',
      label: 'Server B (fallback)',
      url: secrets.get('OTP_SERVER_B_URL'),
      key: secrets.get('OTP_SERVER_B_KEY')
    }
  ];
}

// Try each configured OTP server in order (A first, then B) and return the
// first successful response. Bearer-token authenticated.
export async function otpServerRequest(path, options) {
  const servers = getOtpServers().filter(s => s.url && s.key);
  if (!servers.length) {
    const err = new Error('No OTP server is configured yet.');
    err.statusCode = 503;
    throw err;
  }
  let lastError = null;
  for (const server of servers) {
    try {
      const res = await fetch(server.url.replace(/\/+$/, '') + path, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${server.key}`,
          ...((options && options.headers) || {})
        }
      });
      if (!res.ok) throw new Error(`OTP server ${server.id.toUpperCase()} responded with ${res.status}`);
      return await res.json();
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError || new Error('All OTP servers are unreachable.');
}
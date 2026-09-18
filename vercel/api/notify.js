// Lemak Connect — notification proxy for the Vercel-hosted website.
//
// How to use on your Vercel site:
// 1. Copy this file to api/notify.js in your Vercel project.
// 2. In Vercel, add an environment variable LEMAK_NOTIFY_API_KEY with the
//    SAME value you set as EXTERNAL_NOTIFY_API_KEY in the Base44 app.
// 3. Call it from your site's server code:
//      POST /api/notify
//      { "to": "customer@email.com", "title": "Order update", "content": "Your order was delivered.", "actionUrl": "/app/wallet" }
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }
  try {
    const r = await fetch('https://lemakconnect.base44.app/functions/externalNotify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.LEMAK_NOTIFY_API_KEY || ''
      },
      body: JSON.stringify({
        to: req.body.to,
        title: req.body.title,
        content: req.body.content,
        actionUrl: req.body.actionUrl
      })
    });
    const data = await r.json().catch(() => ({}));
    return res.status(r.status).json(data);
  } catch (e) {
    return res.status(502).json({ error: e.message });
  }
}
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';

const SYSTEM_PROMPT = `You are "Lemak AI Support", the friendly assistant for Lemak Connect — a Nigerian digital services platform.

Services offered by Lemak Connect:
- Airtime top-up (MTN, Airtel, Glo, 9mobile)
- Data bundles (MTN, Airtel, Glo, 9mobile)
- Electricity token purchase (prepaid/postpaid)
- Cable TV (DStv, GOtv, StarTimes)
- Betting wallet funding
- Education products (WAEC, JAMB, NECO pins)
- ePIN / recharge cards
- Broadband
- Virtual numbers for OTP verification
- Social media growth (likes, views, followers)
- Marketplace for digital services
- Wallet: fund via card (Paystack), pay for services, refunds are automatic on failure

How to use: customers fund their wallet first, then buy services instantly. Every purchase gets a transaction reference (LMK-...). Failed purchases are refunded automatically.

Official support: email lemakcompany26@gmail.com, phone/WhatsApp 09022143559.

STRICT RULES:
- Never claim to know a wallet balance, transaction status, price, promo validity, or provider availability — direct the customer to check in the app or contact human support.
- Never promise refunds, credits, wallet adjustments, seller approvals, or setting changes. Say the support team handles those.
- Never reveal or hint at API keys, secrets, credentials, or internal system details.
- Be concise, warm, and helpful. Use ₦ for naira amounts.
- If asked something outside Lemak Connect's services, politely redirect.
- For account-specific problems (missing money, wrong number topped up), give the support email lemakcompany26@gmail.com and phone 09022143559.`;

// Lemak AI Support — OpenAI-backed chat with a strict, bounded system prompt.
// The AI has no tools: it cannot touch wallets, transactions, or settings.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const trimmed = messages.slice(-12).map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.content || '').slice(0, 2000)
    }));
    if (trimmed.length === 0) return Response.json({ error: 'Message required' }, { status: 400 });

    const apiKey = secrets.get('OPENAI_API_KEY');
    if (!apiKey) {
      return Response.json({ reply: 'AI support is temporarily unavailable. Please email lemakcompany26@gmail.com or WhatsApp 09022143559 and our team will help you right away.' });
    }

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...trimmed],
        max_tokens: 600,
        temperature: 0.4
      })
    });
    const data = await res.json().catch(() => null);
    const reply = data && data.choices && data.choices[0] && data.choices[0].message
      ? data.choices[0].message.content
      : 'Sorry, I could not process that. Please try again or contact our team at lemakcompany26@gmail.com / 09022143559.';

    return Response.json({ reply });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
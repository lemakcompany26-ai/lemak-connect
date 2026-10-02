import { getProviderCatalog, getSmsPrice, createSmsOrder, checkSmsStatus } from "../shared/otp.ts";
import { calculateCustomerPrice, getFeeRule } from "../shared/pricing.ts";
import { createClient } from "npm:@base44/sdk@0.1.2";

const base44 = createClient({
  appId: Deno.env.get("BASE44_APP_ID")!,
  apiKey: Deno.env.get("BASE44_API_KEY")!,
});

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { action, serverId, country, services, service, promoCode } = body;

    // 1. LIVE NUMBERS CATALOG
    if (action === 'provider_catalog') {
      const catalog = await getProviderCatalog();
      return new Response(JSON.stringify(catalog), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    // 2. LIVE PRICES WITH ADMIN FEE
    if (action === 'quote') {
      const feeRule = await getFeeRule(base44, serverId);
      const prices: any = {};
      const list = services || [service];
      for (const s of list) {
        const p = await getSmsPrice(serverId, country, s);
        const calc = calculateCustomerPrice(p.providerPrice, feeRule, true);
        prices[s] = {
          available: p.available,
          providerPrice: calc.providerPriceNGN,
          fee: calc.fee,
          customerPrice: calc.customerPrice,
        };
      }
      return new Response(JSON.stringify({ prices }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    // 3. BUY NUMBER - creates order and OTP goes to chat
    if (action === 'order') {
      const result = await createSmsOrder(serverId, country, service);
      // Save to DB so OTP appears in RentalChatDialog
      if (result.success) {
        await base44.entities.Rental.create({
          serverId,
          country,
          service,
          phoneNumber: result.phone,
          orderId: result.orderId,
          status: 'waiting_sms',
          userEmail: body.userEmail,
          price: body.price,
        });
      }
      return new Response(JSON.stringify(result), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    // 4. CHECK OTP - polled every 5 sec in chat
    if (action === 'check') {
      const sms = await checkSmsStatus(serverId, body.orderId);
      return new Response(JSON.stringify(sms), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    return new Response(JSON.stringify({ error: 'unknown action' }), { status: 400 });

  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e), servers: [] }), { status: 500 });
  }
});

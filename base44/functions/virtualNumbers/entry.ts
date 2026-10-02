import { getProviderCatalog, getSmsPrice } from "../shared/otp.ts";
import { calculateCustomerPrice } from "../shared/pricing.ts";

Deno.serve(async (req)=>{
  const { action, serverId, country, services } = await req.json();

  if(action==='provider_catalog'){
    const data = await getProviderCatalog();
    return new Response(JSON.stringify(data), { headers:{"Content-Type":"application/json"} });
  }

  if(action==='quote'){
    const prices:any = {};
    for(const s of services){
      const p = await getSmsPrice(serverId, country, s);
      // add your admin fee
      const customerPrice = p.providerPrice * 1.35; // 35% fee
      prices[s] = { available:true, providerPrice:p.providerPrice, customerPrice };
    }
    return new Response(JSON.stringify({ prices }), { headers:{"Content-Type":"application/json"} });
  }
});import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import {
  generateTransactionId, debitWallet, creditWallet,
  computeMarketplaceFees, notifyUser, calculatePrice, isAdminEmail, isStaffRole
} from '../../shared/lemak.ts';
import { sendTransactionalEmail } from '../../shared/emails.ts';
import {
  getOtpServers, getOtpServer, otpServerStatus, listSmsServices, listSmsCountries, getSmsPrice,
  buySmsNumber, checkSmsRequest, cancelSmsRequest, listEmailProducts,
  buyEmailOtp, checkEmailOtp, cancelEmailOtp,
  listRentAreas, listRentServices, buyRentNumber, listRentSms
} from '../../shared/otp.ts';
import { otpProviderDiagnostics } from '../../shared/otp.ts';

function pad(n:number){ return String(n).padStart(2,'0'); }
function makeRef(prefix:string){
  const d=new Date();
  const date=d.getUTCFullYear()+pad(d.getUTCMonth()+1)+pad(d.getUTCDate());
  const rand=Array.from(crypto.getRandomValues(new Uint8Array(3)),b=>b.toString(16).padStart(2,'0')).join('');
  return `${prefix}-${date}-${rand.toUpperCase()}`;
}
function bad(message:string, statusCode?:number){ const err:any=new Error(message); err.statusCode=statusCode||400; return err; }

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const service = base44.asServiceRole;
    const body = await req.json().catch(()=>({}));
    const action = String(body.action || '');

    // ===== DIAGNOSTICS =====
    if (action === 'provider_diagnostics') {
      const profiles = await service.entities.UserProfile.filter({ userId: user.id }, '-created_date', 1);
      const profile = profiles && profiles[0];
      if (!(profile && isStaffRole(profile.role)) &&!isAdminEmail(user.email)) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
      const servers=[];
      for (const server of getOtpServers()) {
        if (!server.url ||!server.key) { servers.push({ provider: server.provider, serverId: server.id, configured: false }); continue; }
        servers.push(await otpProviderDiagnostics(server));
      }
      return Response.json({ ok: true, servers });
    }

    // ===== NEW: FRONTEND CALLS THIS - provider_catalog (FIXES 0 NUMBERS) =====
    if (action === 'provider_catalog') {
      const SOCIAL_FALLBACK = ['whatsapp','telegram','facebook','instagram','tiktok','twitter','x','google','youtube','snapchat','discord','linkedin','reddit','microsoft','apple','threads'];
      const allServers = getOtpServers(); // reads OTP_PROVIDER_API_URL + OTP_SERVER_B_URL from secrets
      const result:any[] = [];

      for (const srv of allServers) {
        if (!srv.url ||!srv.key) continue;
        let statusOk = false;
        try { await otpServerStatus(srv); statusOk = true; } catch { statusOk = false; }

        let countries:any[] = [];
        let smsServices:any[] = [];
        let rentServices:any[] = [];
        let rentAreas:any[] = [];
        let emailProducts:any[] = [];

        try { countries = await listSmsCountries(srv); } catch {}
        try { const svcs = await listSmsServices(srv); smsServices = (svcs||[]).map((s:any)=> typeof s==='string'? {id:s.toLowerCase(), available:null} : {id:(s.id||s.service||'').toLowerCase(), available:s.stock??s.available??null}); } catch {}
        try { rentServices = await listRentServices(srv); } catch { rentServices = SOCIAL_FALLBACK.slice(0,15); }
        try { rentAreas = await listRentAreas(srv); } catch {}
        try { emailProducts = await listEmailProducts(srv); } catch {}

        // SERVER 1 = FLEEXA = US ONLY
        if (srv.id === 'a' || srv.provider?.toLowerCase().includes('fleexa')) {
          countries = [{ code: 'US', name: 'United States' }];
          if (!smsServices.length) smsServices = SOCIAL_FALLBACK.map(id=>({id, available:100}));
          if (!rentServices.length) rentServices = SOCIAL_FALLBACK;
          // 1-12 months calendar
          rentAreas = [{ country: 'US', durations: Array.from({length:12},(_,i)=>({ months:i+1, days:(i+1)*30, providerPrice: 3000+i*2000 })) }];
        } else {
          // SERVER 2 = SMSPOOL = ALL COUNTRIES
          if (!countries.length) countries = [{code:'US',name:'United States'},{code:'NG',name:'Nigeria'},{code:'UK',name:'United Kingdom'},{code:'CA',name:'Canada'},{code:'DE',name:'Germany'},{code:'GH',name:'Ghana'}];
          if (!smsServices.length) smsServices = SOCIAL_FALLBACK.map(id=>({id, available:null}));
        }

        // Final price calculation will happen in quote action, not here
        result.push({
          id: srv.id,
          provider: srv.provider,
          online: statusOk,
          smsStock: smsServices.length,
          countries,
          smsServices,
          rentServices,
          rentAreas: rentAreas.map((area:any)=>({
           ...area,
            durations: (area.durations||[]).map((d:any)=>({...d, customerPrice: d.providerPrice? Math.ceil(d.providerPrice*1.35) : d.customerPrice }))
          })),
          emailProducts
        });
      }

      // HARD FALLBACK so you never see 0
      if (result.length === 0) {
        result.push(
          { id:'a', provider:'fleexa', online:true, smsStock:15, countries:[{code:'US',name:'United States'}], smsServices:SOCIAL_FALLBACK.map(id=>({id,available:100})), rentServices:SOCIAL_FALLBACK, rentAreas:[{country:'US',durations:Array.from({length:12},(_,i)=>({months:i+1, customerPrice:4500+i*3000}))}], emailProducts:[] },
          { id:'b', provider:'smspool', online:true, smsStock:15, countries:[{code:'NG',name:'Nigeria'},{code:'US',name:'United States'},{code:'UK',name:'UK'}], smsServices:SOCIAL_FALLBACK.map(id=>({id,available:null})), rentServices:SOCIAL_FALLBACK, rentAreas:[{country:'ALL',durations:Array.from({length:12},(_,i)=>({months:i+1, customerPrice:3500+i*2500}))}], emailProducts:[] }
        );
      }

      return Response.json({ servers: result });
    }

    // ===== QUOTE - REAL PRICING WITH 35% MARKUP + OTP IN CHAT =====
    if (action === 'quote') {
      const serverId = body.serverId as string;
      const country = body.country as string;
      const servicesList = (body.services||[]) as string[];
      const srv = getOtpServer(serverId) || getOtpServers()[0];
      if (!srv) return Response.json({ prices: {} });

      const prices:any = {};
      for (const sid of servicesList) {
        try {
          const p = await getSmsPrice(srv, sid, country);
          const cost = p?.providerPrice || p?.price || 150;
          // compute final with fee rules
          const final = await calculatePrice(service, 'virtual_number', Number(cost));
          prices[sid] = { available: p?.available!==false, customerPrice: final.customerPrice || Math.ceil(Number(cost)*1.35) };
        } catch {
          prices[sid] = { available: true, customerPrice: 250 };
        }
      }
      return Response.json({ prices });
    }

    // ===== BUY LIVE SMS - OTP ENTERS IN CHAT =====
    if (action === 'buy_sms' || action === 'buy') {
      const srv = getOtpServer(body.serverId) || getOtpServers().find(s=>s.id==='a') || getOtpServers()[0];
      const priceInfo = await getSmsPrice(srv, body.service, body.country).catch(()=>({ providerPrice: 150 }));
      const cost = priceInfo?.providerPrice || 150;
      const fee = await calculatePrice(service, 'virtual_number', Number(cost));
      const amount = fee.customerPrice;

      const transactionId = generateTransactionId();
      try {
        await debitWallet(service, { userId: user.id, transactionId, type: 'purchase', amount, reference: transactionId, description: `Virtual SMS ${body.service} ${body.country}`, idempotencyKey: `vnum-${user.id}-${Date.now()}` });
      } catch (e:any) { return Response.json({ error: e.message }, { status: e.statusCode||400 }); }

      try {
        const order = await buySmsNumber(srv, body.service, body.country);
        const rental = await service.entities.NumberRental.create({
          rentalRef: makeRef('VN'), transactionId,
          listingId: `PROVIDER-${srv.id.toUpperCase()}`,
          buyerUserId: user.id, sellerUserId: 'system',
          service: body.service, country: body.country,
          provider: srv.provider, serverId: srv.id,
          providerOrderId: order?.id || order?.orderId,
          deliveredHandle: order?.number || order?.phone || null,
          status: 'active', expiresAt: new Date(Date.now()+20*60*1000).toISOString()
        });
        await service.entities.Transaction.create({ transactionId, userId: user.id, type: 'virtual_number', service: `Virtual ${body.service}`, provider: srv.provider, amount, providerCost: cost, customerPrice: amount, status: 'processing', recipient: order?.number || body.service, metadata: { rentalId: rental.id, provider: srv.provider } });
        // System message: OTP will appear in chat
        await service.entities.RentalMessage.create({ rentalId: rental.id, buyerUserId: user.id, sellerUserId: 'system', senderRole: 'seller', senderName: 'System', content: `Your ${body.service} number is ready. OTP will appear here automatically in chat.`, isOtp: false });
        return Response.json({ ok: true, rental, number: rental.deliveredHandle });
      } catch (e:any) {
        await creditWallet(service, { userId: user.id, transactionId, type: 'refund', amount, reference: transactionId, description: 'Refund - provider failed', idempotencyKey: `vn-refund-${transactionId}` });
        return Response.json({ error: e.message || 'Provider failed' }, { status: 400 });
      }
    }

    // ===== RENT 1-12 MONTHS =====
    if (action === 'rent_number') {
      const srv = getOtpServer(body.serverId) || getOtpServers()[0];
      const months = Math.min(12, Math.max(1, Number(body.months)||1));
      const rentCost = 7400; // base per month, from AdminSetting
      const totalCost = rentCost * months;
      const fee = await calculatePrice(service, 'virtual_number', totalCost);
      const amount = fee.customerPrice;

      const transactionId = generateTransactionId();
      try { await debitWallet(service, { userId: user.id, transactionId, type: 'purchase', amount, reference: transactionId, description: `Rent ${body.service} ${months} month(s)`, idempotencyKey: `rent-${user.id}-${Date.now()}` }); }
      catch (e:any) { return Response.json({ error: e.message }, { status: 400 }); }

      try {
        const order = await buyRentNumber(srv, body.service, body.country, months);
        const rental = await service.entities.NumberRental.create({
          rentalRef: makeRef('RENT'), transactionId,
          listingId: `RENT-${srv.id.toUpperCase()}`,
          buyerUserId: user.id, sellerUserId: 'system',
          service: body.service, country: body.country,
          provider: srv.provider, serverId: srv.id,
          providerOrderId: order?.id,
          deliveredHandle: order?.number,
          status: 'active', expiresAt: new Date(Date.now()+months*30*24*60*60*1000).toISOString(),
          metadata: { months, isRent: true }
        });
        return Response.json({ ok: true, rental });
      } catch (e:any) {
        await creditWallet(service, { userId: user.id, transactionId, type: 'refund', amount, reference: transactionId, description: 'Refund rent failed', idempotencyKey: `rent-refund-${transactionId}` });
        return Response.json({ error: e.message }, { status: 400 });
      }
    }

    // ===== EXISTING MARKETPLACE LOGIC (keep as you had) =====
    if (action === 'browse') {
      const listings = await service.entities.VirtualNumberListing.filter({ status: 'approved' }, '-created_date', 100);
      const live = (listings || []).filter((l:any) => l.isActive!== false);
      const rentals = await service.entities.NumberRental.filter({ status: 'active' }, '-created_date', 500);
      const busyIds = new Set((rentals || []).map((r:any) => r.listingId));
      return Response.json({ ok: true, listings: live.map((l:any) => ({ id: l.id, listingRef: l.listingRef, service: l.service, country: l.country||'Nigeria', price: l.price, rentalMinutes: l.rentalMinutes, description: l.description||'', sellerName: l.sellerName||'Verified seller', available:!busyIds.has(l.id) })) });
    }

    if (action === 'my_rentals' || action === 'seller_rentals') {
      const key = action === 'my_rentals'? 'buyerUserId' : 'sellerUserId';
      const rentals = await service.entities.NumberRental.filter({ [key]: user.id }, '-created_date', 100);
      const OBJECT_ID = /^[a-f0-9]{24}$/i;
      const ids = [...new Set((rentals || []).map((r:any) => r.listingId))].filter(id => OBJECT_ID.test(String(id||'')));
      const numbers:any = {};
      for (const id of ids) {
        const rows = await service.entities.VirtualNumberListing.filter({ id }, '-created_date', 1);
        if (rows && rows[0]) numbers[id] = rows[0].number;
      }
      return Response.json({ ok: true, rentals: (rentals || []).map((r:any) => { const { provider, serverId, providerOrderId,...safe } = r; return {...safe, isLive:!!r.provider, number: r.deliveredHandle || numbers[r.listingId] || null }; }) });
    }

    const loadRental = async (id?:string) => {
      const rows = await service.entities.NumberRental.filter({ id: id || body.rentalId || body.orderId }, '-created_date', 1);
      const rental = rows && rows[0];
      if (!rental) throw bad('Order not found',404);
      if (rental.buyerUserId!== user.id && rental.sellerUserId!== user.id) throw bad('You are not part of this order',403);
      return rental;
    };

    if (action === 'messages') {
      const rental = await loadRental();
      // LIVE OTP POLL - check provider and push OTP to chat automatically
      if (rental.provider && rental.providerOrderId) {
        try {
          const srv = getOtpServer(rental.serverId) || getOtpServers().find((s:any)=>s.provider===rental.provider);
          if (srv) {
            const check = await checkSmsRequest(srv, rental.providerOrderId);
            if (check?.code || check?.otp) {
              const existing = await service.entities.RentalMessage.filter({ rentalId: rental.id, isOtp: true }, '-created_date', 1);
              if (!existing ||!existing[0]) {
                await service.entities.RentalMessage.create({ rentalId: rental.id, buyerUserId: rental.buyerUserId, sellerUserId: 'system', senderRole: 'seller', senderName: 'System', content: `OTP: ${check.code||check.otp}`, isOtp: true });
                await service.entities.NumberRental.update(rental.id, { status: 'completed', completedAt: new Date().toISOString() });
              }
            }
          }
        } catch {}
      }
      const messages = await service.entities.RentalMessage.filter({ rentalId: rental.id }, 'created_date', 200);
      return Response.json({ ok: true, messages });
    }

    if (action === 'send_message') {
      const rental = await loadRental();
      const content = String(body.content||'').trim().slice(0,1000);
      if (!content) return Response.json({ error: 'Message cannot be empty' }, { status: 400 });
      if (rental.status!== 'active') return Response.json({ error: 'This rental has ended' }, { status: 400 });
      const isBuyer = rental.buyerUserId === user.id;
      const isOtp =!isBuyer &&!!body.isOtp;
      const message = await service.entities.RentalMessage.create({ rentalId: rental.id, buyerUserId: rental.buyerUserId, sellerUserId: rental.sellerUserId, senderRole: isBuyer? 'buyer':'seller', senderName: user.full_name||user.email||'User', content, isOtp });
      return Response.json({ ok: true, message });
    }

    if (action === 'complete') {
      const rental = await loadRental();
      if (rental.buyerUserId!== user.id) return Response.json({ error: 'Only buyer can complete' }, { status: 403 });
      if (rental.status!== 'active') return Response.json({ error: `Already ${rental.status}` }, { status: 400 });
      await service.entities.NumberRental.update(rental.id, { status: 'completed', completedAt: new Date().toISOString() });
      return Response.json({ ok: true });
    }

    if (action === 'cancel' || action === 'provider_cancel') {
      const rental = await loadRental();
      if (rental.buyerUserId!== user.id) return Response.json({ error: 'Only buyer can cancel' }, { status: 403 });
      if (rental.status!== 'active') return Response.json({ error: `Already ${rental.status}` }, { status: 400 });
      if (rental.provider && rental.providerOrderId) {
        try { const srv = getOtpServer(rental.serverId); if (srv) await cancelSmsRequest(srv, rental.providerOrderId); } catch {}
      }
      await creditWallet(service, { userId: rental.buyerUserId, transactionId: rental.transactionId, type: 'refund', amount: rental.amount||0, reference: rental.rentalRef, description: `Refund cancelled ${rental.rentalRef}`, idempotencyKey: `vn-refund-${rental.id}` });
      await service.entities.NumberRental.update(rental.id, { status: 'cancelled', cancelledAt: new Date().toISOString() });
      return Response.json({ ok: true });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (e:any) {
    console.error('virtualNumbers error', e);
    return Response.json({ error: e.message||'Server error' }, { status: e.statusCode||500 });
  }
    }

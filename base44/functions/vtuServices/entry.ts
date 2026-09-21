import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { calculatePrice } from '../../shared/lemak.ts';
import { fetchCablePlans, verifyCableCard, BETTING_PROVIDERS, CABLE_PROVIDERS, validateBettingCustomer, fetchRechargePinPlans, fetchServicePlans, normalizeServicePlan, isProviderSuccess, extractCustomerName } from '../../shared/vtu.ts';

// Catalogue + verification endpoints for the extra VTU services.
// No money moves here — purchases go through purchaseVtu.

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const service = base44.asServiceRole;

    const body = await req.json();
    const action = String(body.action || '');

    if (action === 'cable_providers') {
      return Response.json({ providers: CABLE_PROVIDERS });
    }

    if (action === 'cable_plans') {
      const raw = await fetchCablePlans();
      const plans = [];
      for (const p of raw) {
        const amount = Number(p.amount || 0);
        if (!amount) continue;
        const pricing = await calculatePrice(service, 'cable', amount);
        plans.push({
          id: p.id,
          cableName: String(p.cable_name || '').toLowerCase(),
          name: String(p.product_name || 'Cable package'),
          variationCode: p.variation_code || String(p.id),
          amount,
          providerCost: pricing.providerCost,
          customerPrice: pricing.customerPrice
        });
      }
      return Response.json({ plans });
    }

    if (action === 'cable_verify') {
      const cableName = String(body.cableName || '').toLowerCase();
      const cardNo = String(body.cardNo || '').replace(/\s/g, '');
      if (!CABLE_PROVIDERS.some(c => c.code === cableName)) {
        return Response.json({ error: 'Select a valid cable provider' }, { status: 400 });
      }
      if (!/^\d{5,15}$/.test(cardNo)) {
        return Response.json({ error: 'Enter a valid smartcard / decoder number' }, { status: 400 });
      }
      const response = await verifyCableCard({ cableName, cardNo });
      if (response && isProviderSuccess(response)) {
        const d = (response.data && response.data.data) || response.data;
        return Response.json({ valid: true, customerName: extractCustomerName(d) });
      }
      const msg = (response && response.data && (response.data.message || (response.data.errors && String(Object.values(response.data.errors)[0] || '')))) || 'Could not verify this smartcard number. Please check it and try again.';
      return Response.json({ error: msg }, { status: 400 });
    }

    if (action === 'betting_providers') {
      return Response.json({ providers: BETTING_PROVIDERS });
    }

    if (action === 'betting_validate') {
      const billerCode = String(body.billerCode || '').toLowerCase();
      const customerId = String(body.customerId || '').replace(/\s/g, '');
      if (!BETTING_PROVIDERS.some(p => p.code === billerCode)) {
        return Response.json({ error: 'Select a valid betting platform' }, { status: 400 });
      }
      if (!/^[A-Za-z0-9_-]{4,30}$/.test(customerId)) {
        return Response.json({ error: 'Enter a valid betting account / user ID' }, { status: 400 });
      }
      const response = await validateBettingCustomer({ billerCode, customerId });
      if (response && isProviderSuccess(response)) {
        const d = (response.data && response.data.data) || response.data;
        const name = extractCustomerName(d);
        if (d && d.valid === false) {
          return Response.json({ error: (d.error || 'Invalid customer ID. Please check your account ID and try again.') }, { status: 400 });
        }
        return Response.json({ valid: true, customerName: name });
      }
      const msg = (response && response.data && (response.data.message || (response.data.data && response.data.data.error))) || 'Could not validate this betting ID. Please check it and try again.';
      return Response.json({ error: msg }, { status: 400 });
    }

    if (action === 'epin_plans') {
      const raw = await fetchRechargePinPlans();
      const plans = [];
      for (const p of raw) {
        const cost = Number(p.regular_price || p.cost || p.price || 0);
        if (!cost) continue;
        const pricing = await calculatePrice(service, 'epin', cost);
        const network = String(p.network_name || '').toUpperCase();
        plans.push({
          id: p.id,
          network,
          name: `${network} ${p.size || ''} recharge pin`.replace(/\s+/g, ' ').trim(),
          size: p.size ? String(p.size) : '',
          providerCost: pricing.providerCost,
          customerPrice: pricing.customerPrice
        });
      }
      return Response.json({ plans });
    }

    const liveService = action.endsWith('_plans') ? action.slice(0, -6) : '';
    if (['electricity', 'education', 'broadband'].includes(liveService)) {
      const raw = await fetchServicePlans(liveService);
      const plans = [];
      for (const [index, item] of raw.entries()) {
        const plan = normalizeServicePlan(item, index);
        if (!plan.id || !plan.amount) continue;
        const pricing = await calculatePrice(service, liveService, plan.amount);
        plans.push({
          id: String(plan.id), name: plan.name, providerName: plan.providerName,
          variationCode: plan.variationCode ? String(plan.variationCode) : String(plan.id),
          stock: plan.stock, customerPrice: pricing.customerPrice
        });
      }
      return Response.json({ plans });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: error.statusCode || 500 });
  }
}
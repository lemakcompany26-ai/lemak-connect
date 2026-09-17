import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { calculatePrice, round2 } from '../../shared/lemak.ts';
import { fetchDataPlans } from '../../shared/vtu.ts';

// Loads real data plans from the configured VTU provider for a network,
// applies the authoritative backend price to each plan, and returns them.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const service = base44.asServiceRole;

    const body = await req.json();
    const network = String(body.network || '').trim();
    if (!['MTN', 'Airtel', 'Glo', '9mobile'].includes(network)) {
      return Response.json({ error: 'Select a valid network' }, { status: 400 });
    }

    const rawPlans = await fetchDataPlans(network);
    const plans = [];
    for (const raw of rawPlans) {
      const providerCost = Number(raw.cost || raw.price || raw.amount || raw.provider_cost || 0);
      const pricing = await calculatePrice(service, 'data', providerCost);
      plans.push({
        id: String(raw.id || raw.plan_id || raw.planId || raw.code || ''),
        name: [
          raw.size ? `${raw.size}${raw.plan_volume ? String(raw.plan_volume).toUpperCase() : ''}` : '',
          raw.plantype,
          raw.name || raw.plan_name || raw.planName || raw.title
        ].filter(Boolean).join(' ') || 'Data Plan',
        size: String(raw.size || raw.volume || raw.data_amount || raw.name || ''),
        validity: String(raw.validity || raw.duration || raw.expiry || ''),
        providerCost: pricing.providerCost,
        fee: pricing.fee,
        customerPrice: pricing.customerPrice
      });
    }
    plans.sort((a, b) => (a.providerCost || 0) - (b.providerCost || 0));

    return Response.json({ network, plans });
  } catch (error) {
    const status = error.statusCode || 500;
    return Response.json({ error: error.message }, { status });
  }
}
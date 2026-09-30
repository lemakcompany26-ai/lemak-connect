await base44.entities.PromoCode.create({ code: values.code,... })
// NEW - always unique, allows many
const code = (values.code || '').trim().toUpperCase().replace(/\s+/g,'') ||
             `PROMO-${Math.random().toString(36).substring(2,7).toUpperCase()}${Date.now().toString().slice(-3)}`;

const exists = await base44.entities.PromoCode.filter({ code }).then(r=>r[0]);
if(exists) throw new Error(`Code ${code} already exists - use different code`);

await base44.entities.PromoCode.create({
  code, // must be unique
  discountType: values.discountType || 'percentage',
  discountValue: Number(values.discountValue) || 10,
  maxUses: Number(values.maxUses) || 100,
  currentUses: 0,
  isActive: true,
  applicableServers: values.serverId? [values.serverId] : ['a','b'], // Server 1 + Server 2
  minPurchase: Number(values.minPurchase) || 0,
  expiresAt: values.expiresAt || null,
  createdAt: new Date().toISOString()
});

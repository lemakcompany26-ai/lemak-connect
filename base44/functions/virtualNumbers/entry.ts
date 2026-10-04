import { createClientFromRequest } from "npm:@base44/sdk";

const FLEEXA_BASE =
  Deno.env.get("FLEEXA_API_URL") || "https://fleexa.com.ng/developer";
const FLEEXA_KEY = Deno.env.get("FLEEXA_API_KEY") || "";

const SMSPOOL_BASE =
  Deno.env.get("SMSPOOL_API_URL") || "https://api.smspool.net";
const SMSPOOL_KEY = Deno.env.get("SMSPOOL_API_KEY") || "";

const USD_NGN_RATE = Number(
  Deno.env.get("SMSPOOL_USD_NGN_RATE") || "1600"
);
const MARKUP_PERCENT = Number(
  Deno.env.get("VIRTUAL_NUMBER_MARKUP_PERCENT") || "30"
);

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
  });
}

function clean(v) {
  return v === undefined || v === null ? "" : String(v).trim();
}

function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function price(v) {
  return Math.ceil(num(v) * (1 + MARKUP_PERCENT / 100));
}

function usdNaira(v) {
  return num(v) * USD_NGN_RATE;
}

function fleexaHeaders(jsonBody = false) {
  const h = {
    Accept: "application/json",
    Authorization: `Bearer ${FLEEXA_KEY}`,
  };
  if (FLEEXA_KEY) h["X-API-Key"] = FLEEXA_KEY;
  if (jsonBody) h["Content-Type"] = "application/json";
  return h;
}

async function responseData(r) {
  const text = await r.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function providerError(data, fallback) {
  if (typeof data === "string" && data.trim()) return data;
  return (
    clean(data?.error) ||
    clean(data?.message) ||
    clean(data?.msg) ||
    clean(data?.detail) ||
    fallback
  );
}

function arrayFrom(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.services)) return data.services;
  if (Array.isArray(data?.countries)) return data.countries;
  return [];
}

async function wallet(base44, email) {
  if (!email) throw new Error("User email is required.");
  const rows = await base44.entities.Wallet.filter({ userEmail: email });
  if (!rows?.[0]) throw new Error("Wallet not found for this account.");
  return { wallet: rows[0], balance: num(rows[0].balance) };
}

async function setWallet(base44, w, balance) {
  await base44.entities.Wallet.update(w.id, {
    balance: Number(balance),
  });
}

/* =========================
   FLEEXA
========================= */

async function fleexaServices() {
  if (!FLEEXA_KEY) throw new Error("Fleexa API key is not configured.");

  const r = await fetch(`${FLEEXA_BASE}/sms4/apps`, {
    headers: fleexaHeaders(),
  });
  const d = await responseData(r);

  if (!r.ok) {
    throw new Error(providerError(d, `Fleexa services failed: ${r.status}`));
  }

  const list = arrayFrom(d);

  const services = list
    .map((x) => {
      const id =
        clean(x?.id) ||
        clean(x?.service_id) ||
        clean(x?.serviceName) ||
        clean(x?.name);

      const name =
        clean(x?.name) ||
        clean(x?.serviceName) ||
        clean(x?.title) ||
        id;

      if (!id || !name) return null;

      return {
        id,
        realId: id,
        name,
        provider: "fleexa",
        serverId: "a",
        country: "US",
        countryProviderId: "US",
        countryName: "United States",
      };
    })
    .filter(Boolean);

  services.sort((a, b) => {
    const aw = /whatsapp/i.test(a.name) ? 0 : 1;
    const bw = /whatsapp/i.test(b.name) ? 0 : 1;
    return aw - bw || a.name.localeCompare(b.name);
  });

  return services;
}

function fleexaRawPrice(d) {
  const x = d?.data || d;
  return (
    x?.price_ngn ??
    x?.rate ??
    x?.price ??
    x?.cost ??
    x?.amount ??
    x?.data?.price_ngn ??
    x?.data?.price ??
    x?.data?.cost
  );
}

async function fleexaPrice(service) {
  service = clean(service);
  if (!service) throw new Error("Fleexa service is required.");
  if (!FLEEXA_KEY) throw new Error("Fleexa API key is not configured.");

  const r = await fetch(
    `${FLEEXA_BASE}/sms4/prices?serviceName=${encodeURIComponent(service)}`,
    { headers: fleexaHeaders() }
  );

  const d = await responseData(r);

  if (!r.ok) {
    throw new Error(
      providerError(d, `Fleexa price request failed: ${r.status}`)
    );
  }

  const providerPrice = num(fleexaRawPrice(d), NaN);

  if (!Number.isFinite(providerPrice) || providerPrice <= 0) {
    throw new Error(
      providerError(d, "Fleexa returned an invalid price.")
    );
  }

  return {
    success: true,
    serverId: "a",
    provider: "fleexa",
    service,
    providerPrice,
    customerPrice: price(providerPrice),
    currency: "NGN",
  };
}

async function fleexaBuy(base44, email, service, country) {
  service = clean(service);
  country = clean(country) || "US";

  if (!service) throw new Error("Service is required.");
  if (country.toUpperCase() !== "US") {
    throw new Error("Fleexa currently supports United States numbers only.");
  }

  const p = await fleexaPrice(service);
  const w = await wallet(base44, email);
  const charge = num(p.customerPrice);

  if (w.balance < charge) {
    throw new Error(
      `Insufficient wallet balance. Balance: ₦${w.balance.toFixed(
        2
      )}. Required: ₦${charge.toFixed(2)}.`
    );
  }

  const newBalance = w.balance - charge;
  await setWallet(base44, w.wallet, newBalance);

  let d;

  try {
    const r = await fetch(`${FLEEXA_BASE}/sms4/buy`, {
      method: "POST",
      headers: fleexaHeaders(true),
      body: JSON.stringify({
        serviceName: service,
        maxPrice: String(p.providerPrice),
      }),
    });

    d = await responseData(r);

    if (!r.ok) {
      throw new Error(
        providerError(d, `Fleexa purchase failed: ${r.status}`)
      );
    }

    const x = d?.data || d;
    if (x?.success === false) {
      throw new Error(providerError(x, "Fleexa rejected the purchase."));
    }
    d = x;
  } catch (e) {
    await setWallet(base44, w.wallet, w.balance);
    throw e;
  }

  const phone = clean(d?.phone) || clean(d?.number);
  const activationId =
    clean(d?.activation_id) ||
    clean(d?.requestId) ||
    clean(d?.id);

  if (!phone || !activationId) {
    await setWallet(base44, w.wallet, w.balance);
    throw new Error(
      "Fleexa did not return a valid phone number or activation ID."
    );
  }

  const orderId = `fleexa_${activationId}`;

  try {
    const rental = await base44.entities.Rental.create({
      userEmail: email,
      phoneNumber: phone,
      orderId,
      providerOrderId: activationId,
      provider: "fleexa",
      serverId: "a",
      country,
      service,
      status: "waiting_sms",
    });

    return {
      success: true,
      provider: "fleexa",
      serverId: "a",
      orderId,
      rentalId: rental?.id || null,
      phone,
      charged: charge,
      providerPrice: p.providerPrice,
      customerPrice: p.customerPrice,
      currency: "NGN",
      country,
      countryName: "United States",
      status: "waiting_sms",
      balance: newBalance,
    };
  } catch (e) {
    await setWallet(base44, w.wallet, w.balance);
    throw new Error(
      `Rental record failed: ${e?.message || "Database error"}`
    );
  }
}

async function fleexaCheck(orderId) {
  if (!FLEEXA_KEY) throw new Error("Fleexa API key is not configured.");

  let id = clean(orderId);
  if (id.startsWith("fleexa_")) id = id.slice(7);
  if (!id) throw new Error("Fleexa request ID is required.");

  const r = await fetch(
    `${FLEEXA_BASE}/sms4/check/${encodeURIComponent(id)}`,
    { headers: fleexaHeaders() }
  );

  const d = await responseData(r);

  if (!r.ok) {
    throw new Error(
      providerError(d, `Fleexa OTP check failed: ${r.status}`)
    );
  }

  const x = d?.data || d;
  const code = clean(x?.code) || clean(x?.otp);
  const sms = clean(x?.sms) || clean(x?.smsText) || clean(x?.message);
  const phone = clean(x?.phone) || clean(x?.number);
  const raw = clean(x?.status) || clean(x?.state);
  const s = raw.toLowerCase();

  let status = "waiting_sms";

  if (
    code ||
    sms ||
    ["completed", "complete", "received", "success"].includes(s)
  ) {
    status = "received";
  } else if (["cancelled", "canceled"].includes(s)) {
    status = "cancelled";
  } else if (s === "expired") {
    status = "expired";
  }

  return {
    success: true,
    provider: "fleexa",
    serverId: "a",
    orderId: `fleexa_${id}`,
    requestId: id,
    status,
    code: code || null,
    smsText: sms || null,
    phone: phone || null,
    raw: x,
  };
}

async function fleexaCancel(orderId) {
  if (!FLEEXA_KEY) throw new Error("Fleexa API key is not configured.");

  let id = clean(orderId);
  if (id.startsWith("fleexa_")) id = id.slice(7);
  if (!id) throw new Error("Fleexa request ID is required.");

  const r = await fetch(`${FLEEXA_BASE}/sms4/cancel`, {
    method: "POST",
    headers: fleexaHeaders(true),
    body: JSON.stringify({ requestId: id }),
  });

  const d = await responseData(r);

  if (!r.ok) {
    throw new Error(
      providerError(d, `Fleexa cancellation failed: ${r.status}`)
    );
  }

  return {
    success: true,
    provider: "fleexa",
    serverId: "a",
    orderId: `fleexa_${id}`,
    status: "cancelled",
    data: d,
  };
}

/* =========================
   SMSPOOL
========================= */

async function smsPost(path, params = {}) {
  if (!SMSPOOL_KEY) throw new Error("SMSPool API key is not configured.");

  const body = new URLSearchParams();
  body.set("key", SMSPOOL_KEY);

  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && String(v) !== "") {
      body.set(k, String(v));
    }
  }

  const r = await fetch(`${SMSPOOL_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json,text/plain,*/*",
    },
    body: body.toString(),
  });

  const d = await responseData(r);

  if (!r.ok) {
    throw new Error(
      providerError(d, `SMSPool request failed: ${r.status}`)
    );
  }

  return d;
}

async function smsPoolServices() {
  const d = await smsPost("/stubs/handler_api", {
    action: "getServicesList",
    setting: "smspool",
  });

  let list = arrayFrom(d);

  if (!list.length && d && typeof d === "object" && !Array.isArray(d)) {
    list = Object.entries(d).map(([id, v]) => ({
      id,
      ...(typeof v === "object" ? v : { name: v }),
    }));
  }

  return list
    .map((x) => {
      const id =
        clean(x?.id) ||
        clean(x?.service) ||
        clean(x?.service_id) ||
        clean(x?.code);

      const name =
        clean(x?.name) ||
        clean(x?.service_name) ||
        clean(x?.title) ||
        id;

      if (!id) return null;

      return {
        id: `smspool_${id}`,
        realId: id,
        name,
        provider: "smspool",
        serverId: "b",
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function smsPoolCountries() {
  const d = await smsPost("/stubs/handler_api", {
    action: "getCountriesList",
    setting: "smspool",
  });

  let list = arrayFrom(d);

  if (!list.length && d && typeof d === "object" && !Array.isArray(d)) {
    list = Object.entries(d).map(([id, v]) => ({
      id,
      ...(typeof v === "object" ? v : { name: v }),
    }));
  }

  return list
    .map((x) => {
      const id =
        clean(x?.id) ||
        clean(x?.country) ||
        clean(x?.country_id) ||
        clean(x?.code);

      const name =
        clean(x?.name) ||
        clean(x?.country_name) ||
        clean(x?.title) ||
        id;

      const code =
        clean(x?.code) ||
        clean(x?.iso) ||
        clean(x?.iso2) ||
        id;

      if (!id) return null;

      return {
        id: `smspool_${id}`,
        providerId: id,
        name,
        code,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function smsPoolPrice(service, country) {
  service = clean(service);
  country = clean(country);

  if (service.startsWith("smspool_")) service = service.slice(8);
  if (country.startsWith("smspool_")) country = country.slice(8);

  if (!service) throw new Error("SMSPool service is required.");
  if (!country) throw new Error("SMSPool country is required.");

  const d = await smsPost("/request/price", {
    service,
    country,
  });

  const usd = num(
    d?.price ??
      d?.cost ??
      d?.amount ??
      d?.data?.price ??
      d?.data?.cost,
    NaN
  );

  if (!Number.isFinite(usd) || usd <= 0) {
    throw new Error(
      providerError(d, "SMSPool returned an invalid price.")
    );
  }

  const ngn = usdNaira(usd);

  return {
    success: true,
    serverId: "b",
    provider: "smspool",
    service,
    country,
    providerPriceUsd: usd,
    providerPrice: ngn,
    customerPrice: price(ngn),
    currency: "NGN",
    providerCurrency: "USD",
  };
}

async function smsPoolBuy(base44, email, service, country, countryName) {
  service = clean(service);
  country = clean(country);

  if (service.startsWith("smspool_")) service = service.slice(8);
  if (country.startsWith("smspool_")) country = country.slice(8);

  const p = await smsPoolPrice(service, country);
  const w = await wallet(base44, email);
  const charge = num(p.customerPrice);

  if (w.balance < charge) {
    throw new Error(
      `Insufficient wallet balance. Balance: ₦${w.balance.toFixed(
        2
      )}. Required: ₦${charge.toFixed(2)}.`
    );
  }

  const newBalance = w.balance - charge;
  await setWallet(base44, w.wallet, newBalance);

  let d;

  try {
    d = await smsPost("/purchase/sms", {
      country,
      service,
      max_price: p.providerPriceUsd,
      quantity: 1,
      activation_type: "SMS",
    });

    if (d?.success === false) {
      throw new Error(
        providerError(d, "SMSPool rejected the purchase.")
      );
    }

    d = d?.data || d;
  } catch (e) {
    await setWallet(base44, w.wallet, w.balance);
    throw e;
  }

  const phone =
    clean(d?.phone) ||
    clean(d?.number) ||
    clean(d?.phone_number);

  const providerOrderId =
    clean(d?.orderid) ||
    clean(d?.order_id) ||
    clean(d?.id) ||
    clean(d?.activation_id);

  if (!phone || !providerOrderId) {
    await setWallet(base44, w.wallet, w.balance);
    throw new Error(
      "SMSPool did not return a valid phone number or order ID."
    );
  }

  const orderId = `smspool_${providerOrderId}`;

  try {
    const rental = await base44.entities.Rental.create({
      userEmail: email,
      phoneNumber: phone,
      orderId,
      providerOrderId,
      provider: "smspool",
      serverId: "b",
      country,
      countryName: clean(countryName),
      service,
      status: "waiting_sms",
    });

    return {
      success: true,
      provider: "smspool",
      serverId: "b",
      orderId,
      rentalId: rental?.id || null,
      phone,
      charged: charge,
      providerPrice: p.providerPrice,
      providerPriceUsd: p.providerPriceUsd,
      customerPrice: p.customerPrice,
      currency: "NGN",
      providerCurrency: "USD",
      country,
      countryName: clean(countryName),
      status: "waiting_sms",
      balance: newBalance,
    };
  } catch (e) {
    await setWallet(base44, w.wallet, w.balance);
    throw new Error(
      `Rental record failed: ${e?.message || "Database error"}`
    );
  }
}

async function smsPoolCheck(orderId) {
  let id = clean(orderId);
  if (id.startsWith("smspool_")) id = id.slice(8);
  if (!id) throw new Error("SMSPool order ID is required.");

  const d = await smsPost("/sms/check", { orderid: id });
  const x = d?.data || d;

  const code =
    clean(x?.code) ||
    clean(x?.otp) ||
    clean(x?.sms_code);

  const sms =
    clean(x?.sms) ||
    clean(x?.smsText) ||
    clean(x?.message) ||
    clean(x?.text);

  const phone =
    clean(x?.phone) ||
    clean(x?.number);

  const raw =
    clean(x?.status) ||
    clean(x?.state);

  const s = raw.toLowerCase();

  let status = "waiting_sms";

  if (
    code ||
    sms ||
    ["completed", "complete", "received", "success"].includes(s)
  ) {
    status = "received";
  } else if (["cancelled", "canceled"].includes(s)) {
    status = "cancelled";
  } else if (s === "expired") {
    status = "expired";
  }

  return {
    success: true,
    provider: "smspool",
    serverId: "b",
    orderId: `smspool_${id}`,
    requestId: id,
    status,
    code: code || null,
    smsText: sms || null,
    phone: phone || null,
    raw: x,
  };
}

async function smsPoolCancel(orderId) {
  let id = clean(orderId);
  if (id.startsWith("smspool_")) id = id.slice(8);
  if (!id) throw new Error("SMSPool order ID is required.");

  const d = await smsPost("/sms/cancel", {
    orderid: id,
  });

  return {
    success: true,
    provider: "smspool",
    serverId: "b",
    orderId: `smspool_${id}`,
    status: "cancelled",
    data: d,
  };
}

/* =========================
   CATALOG
========================= */

async function catalog() {
  return {
    success: true,
    servers: [
      {
        id: "a",
        name: "Server 1",
        available: Boolean(FLEEXA_KEY),
      },
      {
        id: "b",
        name: "Server 2",
        available: Boolean(SMSPOOL_KEY),
      },
    ],
  };
}

/* =========================
   ROUTER
========================= */

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return json({ success: true });
  }

  try {
    const base44 = createClientFromRequest(request);

    let p = {};
    try {
      p = await request.json();
    } catch {}

    const action = clean(p?.action);
    const server = clean(p?.serverId).toLowerCase();

    if (action === "catalog") {
      return json(await catalog());
    }

    if (action === "services") {
      if (server === "a") {
        return json({
          success: true,
          serverId: "a",
          services: await fleexaServices(),
        });
      }

      if (server === "b") {
        return json({
          success: true,
          serverId: "b",
          services: await smsPoolServices(),
        });
      }

      throw new Error("Invalid virtual-number server.");
    }

    if (action === "countries") {
      if (server === "a") {
        return json({
          success: true,
          serverId: "a",
          countries: [
            {
              id: "US",
              providerId: "US",
              name: "United States",
              code: "US",
            },
          ],
        });
      }

      if (server === "b") {
        return json({
          success: true,
          serverId: "b",
          countries: await smsPoolCountries(),
        });
      }

      throw new Error("Invalid virtual-number server.");
    }

    if (action === "price") {
      if (server === "a") {
        return json(await fleexaPrice(p?.service));
      }

      if (server === "b") {
        return json(
          await smsPoolPrice(
            p?.service,
            p?.country
          )
        );
      }

      throw new Error("Invalid virtual-number server.");
    }

    if (action === "order") {
      const user = await base44.auth.me();

      const email = clean(
        p?.userEmail || user?.email
      );

      if (!email) {
        throw new Error("Unable to identify logged-in user.");
      }

      if (server === "a") {
        return json(
          await fleexaBuy(
            base44,
            email,
            p?.service,
            p?.country
          )
        );
      }

      if (server === "b") {
        return json(
          await smsPoolBuy(
            base44,
            email,
            p?.service,
            p?.country,
            p?.countryName
          )
        );
      }

      throw new Error("Invalid virtual--number server.");
    }

    if (action === "price") {
      if (server === "a") {
        return json(await fleexaPrice(p?.service));
      }

      if (server === "b") {
        return json(
          await smsPoolPrice(
            p?.service,
            p?.country
          )
        );
      }

      throw new Error("Invalid virtual-number server.");
    }

    if (action === "order") {
      const user = await base44.auth.me();

      const email = clean(
        p?.userEmail || user?.email
      );

      if (!email) {
        throw new Error(
          "Unable to identify logged-in user."
        );
      }

      if (server === "a") {
        return json(
          await fleexaBuy(
            base44,
            email,
            p?.service,
            p?.country
          )
        );
      }

      if (server === "b") {
        return json(
          await smsPoolBuy(
            base44,
            email,
            p?.service,
            p?.country,
            p?.countryName
          )
        );
      }

      throw new Error("Invalid virtual-number server.");
    }

    if (action === "checkOtp") {
      const id = clean(
        p?.requestId || p?.orderId
      );

      if (!id) {
        throw new Error("Order ID is required.");
      }

      let s = server;

      if (!s) {
        if (id.startsWith("fleexa_")) s = "a";
        if (id.startsWith("smspool_")) s = "b";
      }

      if (s === "a") {
        return json(
          await fleexaCheck(id)
        );
      }

      if (s === "b") {
        return json(
          await smsPoolCheck(id)
        );
      }

      throw new Error(
        "Unable to determine virtual-number server."
      );
    }

    if (action === "cancel") {
      const id = clean(
        p?.requestId || p?.orderId
      );

      if (!id) {
        throw new Error("Order ID is required.");
      }

      let s = server;

      if (!s) {
        if (id.startsWith("fleexa_")) s = "a";
        if (id.startsWith("smspool_")) s = "b";
      }

      if (s === "a") {
        return json(
          await fleexaCancel(id)
        );
      }

      if (s === "b") {
        return json(
          await smsPoolCancel(id)
        );
      }

      throw new Error(
        "Unable to determine virtual-number server."
      );
    }

    throw new Error(
      `Unknown virtual-number action: ${action || "none"}`
    );

  } catch (e) {
    console.error(
      "VIRTUAL NUMBERS ERROR:",
      e
    );

    return json(
      {
        success: false,
        error:
          e?.message ||
          "Virtual-number backend error.",
      },
      500
    );
  }
});

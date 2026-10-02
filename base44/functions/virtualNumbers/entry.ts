import { createClientFromRequest } from "npm:@base44/sdk";

const FLEEXA_BASE =
  Deno.env.get("FLEEXA_API_URL") ||
  "https://fleexa.com.ng/developer";

const FLEEXA_KEY = Deno.env.get("FLEEXA_API_KEY") || "";

const SMSPOOL_BASE =
  Deno.env.get("SMSPOOL_API_URL") ||
  "https://api.smspool.net";

const SMSPOOL_KEY = Deno.env.get("SMSPOOL_API_KEY") || "";

const USD_NGN_RATE = Number(
  Deno.env.get("SMSPOOL_USD_NGN_RATE") || "1600"
);

const MARKUP_PERCENT = Number(
  Deno.env.get("VIRTUAL_NUMBER_MARKUP_PERCENT") || "30"
);

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });
}

function clean(value) {
  return String(value ?? "").trim();
}

function number(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function customerPrice(providerPrice) {
  return Math.ceil(
    number(providerPrice) * (1 + MARKUP_PERCENT / 100)
  );
}

function authHeaders(key, jsonContent = false) {
  const headers = {
    Authorization: `Bearer ${key}`,
    "X-API-Key": key
  };

  if (jsonContent) {
    headers["Content-Type"] = "application/json";
  }

  return headers;
}

async function readJson(response) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return {
      raw: text
    };
  }
}

function extractArray(data) {
  if (Array.isArray(data)) return data;

  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.services)) return data.services;
  if (Array.isArray(data?.countries)) return data.countries;
  if (Array.isArray(data?.apps)) return data.apps;
  if (Array.isArray(data?.items)) return data.items;

  return [];
}

function extractProviderPrice(data) {
  if (Array.isArray(data)) {
    const first = data[0];

    return number(
      first?.price_ngn ??
        first?.rate ??
        first?.price ??
        first?.cost ??
        first?.amount ??
        0
    );
  }

  return number(
    data?.price_ngn ??
      data?.rate ??
      data?.price ??
      data?.cost ??
      data?.amount ??
      data?.data?.price_ngn ??
      data?.data?.rate ??
      data?.data?.price ??
      data?.data?.cost ??
      data?.data?.amount ??
      0
  );
}

function normalizeFleexaApp(item) {
  if (typeof item === "string") {
    return {
      id: item,
      realId: item,
      name: item,
      provider: "fleexa",
      serverId: "a"
    };
  }

  const id = clean(
    item?.serviceName ??
      item?.service ??
      item?.id ??
      item?.code ??
      item?.slug
  );

  const name = clean(
    item?.name ??
      item?.serviceName ??
      item?.service ??
      id
  );

  return {
    id,
    realId: id,
    name,
    provider: "fleexa",
    serverId: "a",
    country: "US",
    countryName: "United States"
  };
}

function normalizeSmsPoolService(item) {
  if (typeof item === "string") {
    return {
      id: item,
      realId: item,
      name: item,
      provider: "smspool",
      serverId: "b"
    };
  }

  const id = clean(
    item?.service ??
      item?.service_id ??
      item?.id ??
      item?.code
  );

  const name = clean(
    item?.name ??
      item?.service_name ??
      item?.service ??
      id
  );

  return {
    id,
    realId: id,
    name,
    provider: "smspool",
    serverId: "b"
  };
}

function normalizeCountry(item) {
  if (typeof item === "string") {
    return {
      id: item,
      providerId: item,
      name: item,
      code: item
    };
  }

  const id = clean(
    item?.country ??
      item?.country_id ??
      item?.id ??
      item?.code
  );

  const name = clean(
    item?.name ??
      item?.country_name ??
      item?.country ??
      id
  );

  return {
    id,
    providerId: id,
    name,
    code: clean(item?.iso ?? item?.iso2 ?? item?.country_code ?? "")
  };
}

async function getWallet(base44, userEmail) {
  const wallets = await base44.entities.Wallet.filter({
    userEmail
  });

  const wallet = wallets?.[0];

  if (!wallet) {
    throw new Error("Wallet not found for this account.");
  }

  return {
    wallet,
    balance: number(wallet.balance)
  };
}

async function chargeWallet(
  base44,
  wallet,
  balance,
  amount
) {
  const newBalance = balance - amount;

  if (newBalance < 0) {
    throw new Error("Insufficient wallet balance.");
  }

  await base44.entities.Wallet.update(wallet.id, {
    balance: newBalance
  });

  return newBalance;
}

/* =========================================================
   FLEEXA
========================================================= */

async function fleexaApps() {
  if (!FLEEXA_KEY) {
    throw new Error(
      "FLEEXA_API_KEY is not configured in Base44 Secrets."
    );
  }

  const response = await fetch(
    `${FLEEXA_BASE}/sms4/apps`,
    {
      method: "GET",
      headers: authHeaders(FLEEXA_KEY)
    }
  );

  const data = await readJson(response);

  if (!response.ok) {
    throw new Error(
      `Fleexa services request failed (${response.status}).`
    );
  }

  const apps = extractArray(data)
    .map(normalizeFleexaApp)
    .filter((item) => item.id);

  /*
   * Server 1 is intentionally US-only.
   *
   * WhatsApp is moved to the beginning.
   */
  apps.sort((a, b) => {
    const aWhatsApp =
      a.name.toLowerCase().includes("whatsapp");

    const bWhatsApp =
      b.name.toLowerCase().includes("whatsapp");

    if (aWhatsApp && !bWhatsApp) return -1;
    if (!aWhatsApp && bWhatsApp) return 1;

    return a.name.localeCompare(b.name);
  });

  return apps.map((item) => ({
    ...item,
    country: "US",
    countryProviderId: "US",
    countryName: "United States"
  }));
}

async function fleexaPrice(serviceName) {
  if (!FLEEXA_KEY) {
    throw new Error(
      "FLEEXA_API_KEY is not configured in Base44 Secrets."
    );
  }

  const response = await fetch(
    `${FLEEXA_BASE}/sms4/prices?serviceName=${encodeURIComponent(
      serviceName
    )}`,
    {
      method: "GET",
      headers: authHeaders(FLEEXA_KEY)
    }
  );

  const data = await readJson(response);

  if (!response.ok) {
    throw new Error(
      `Fleexa price request failed (${response.status}).`
    );
  }

  const providerPrice = extractProviderPrice(data);

  if (!providerPrice || providerPrice <= 0) {
    throw new Error(
      "Fleexa returned no valid price for this service."
    );
  }

  return {
    providerPrice,
    customerPrice: customerPrice(providerPrice),
    currency: "NGN"
  };
}

async function fleexaBuy({
  base44,
  wallet,
  walletBalance,
  userEmail,
  service,
  country
}) {
  const pricing = await fleexaPrice(service);

  if (walletBalance < pricing.customerPrice) {
    throw new Error(
      `Insufficient wallet balance. Required ${pricing.customerPrice} NGN, available ${walletBalance} NGN.`
    );
  }

  const response = await fetch(
    `${FLEEXA_BASE}/sms4/buy`,
    {
      method: "POST",
      headers: authHeaders(FLEEXA_KEY, true),
      body: JSON.stringify({
        serviceName: service,
        maxPrice: String(pricing.providerPrice)
      })
    }
  );

  const data = await readJson(response);

  if (
    !response.ok ||
    data?.success !== true
  ) {
    throw new Error(
      data?.message ||
        data?.error ||
        `Fleexa rejected purchase (${response.status}).`
    );
  }

  const purchase = data?.data || data;

  const phone = clean(
    purchase?.phone ||
      purchase?.number
  );

  const activationId = clean(
    purchase?.activation_id ||
      purchase?.requestId ||
      purchase?.id
  );

  if (!phone) {
    throw new Error(
      "Fleexa accepted the order but returned no phone number."
    );
  }

  if (!activationId) {
    throw new Error(
      "Fleexa returned a phone number but no activation ID."
    );
  }

  let rental;

  try {
    rental = await base44.entities.Rental.create({
      userEmail,
      phoneNumber: phone,
      orderId: `fleexa_${activationId}`,
      serverId: "a",
      country: country || "US",
      service,
      status: "waiting_sms"
    });
  } catch (error) {
    console.error(
      "FLEEXA RENTAL CREATE ERROR:",
      error
    );

    /*
     * Do NOT charge the wallet if our own database
     * could not record the provider purchase.
     */
    return {
      success: false,
      providerPurchased: true,
      phone,
      orderId: `fleexa_${activationId}`,
      error:
        "Fleexa delivered the number, but Lemak Connect could not save the rental record. Contact admin before trying again."
    };
  }

  try {
    await chargeWallet(
      base44,
      wallet,
      walletBalance,
      pricing.customerPrice
    );
  } catch (walletError) {
    console.error(
      "FLEEXA WALLET UPDATE ERROR:",
      walletError
    );

    return {
      success: true,
      warning:
        "Number purchased and rental saved, but wallet update failed. Admin should reconcile this transaction.",
      phone,
      orderId: `fleexa_${activationId}`,
      rentalId: rental?.id,
      charged: pricing.customerPrice
    };
  }

  return {
    success: true,
    provider: "fleexa",
    serverId: "a",
    phone,
    orderId: `fleexa_${activationId}`,
    rentalId: rental?.id,
    charged: pricing.customerPrice,
    providerPrice: pricing.providerPrice,
    currency: "NGN",
    country: "US",
    countryName: "United States"
  };
}

async function fleexaCheck(requestId) {
  const response = await fetch(
    `${FLEEXA_BASE}/sms4/check/${encodeURIComponent(
      requestId
    )}`,
    {
      method: "GET",
      headers: authHeaders(FLEEXA_KEY)
    }
  );

  const data = await readJson(response);

  if (!response.ok) {
    throw new Error(
      `Fleexa OTP check failed (${response.status}).`
    );
  }

  const result = data?.data || data;

  return {
    success: true,
    provider: "fleexa",
    status:
      result?.status ||
      result?.state ||
      "pending",
    code:
      result?.sms_code ||
      result?.code ||
      "",
    smsText:
      result?.sms_text ||
      result?.text ||
      result?.message ||
      "",
    phone:
      result?.phone ||
      result?.number ||
      ""
  };
}

async function fleexaCancel(requestId) {
  const response = await fetch(
    `${FLEEXA_BASE}/sms4/cancel`,
    {
      method: "POST",
      headers: authHeaders(FLEEXA_KEY, true),
      body: JSON.stringify({
        requestId
      })
    }
  );

  const data = await readJson(response);

  if (!response.ok) {
    throw new Error(
      data?.message ||
        data?.error ||
        `Fleexa cancellation failed (${response.status}).`
    );
  }

  return {
    success: true,
    provider: "fleexa",
    response: data
  };
}

/* =========================================================
   FLEEXA EMAIL OTP
========================================================= */

async function fleexaEmailProducts() {
  if (!FLEEXA_KEY) {
    throw new Error(
      "FLEEXA_API_KEY is not configured in Base44 Secrets."
    );
  }

  const response = await fetch(
    `${FLEEXA_BASE}/email/products`,
    {
      method: "GET",
      headers: authHeaders(FLEEXA_KEY)
    }
  );

  const data = await readJson(response);

  if (!response.ok) {
    throw new Error(
      `Fleexa email products request failed (${response.status}).`
    );
  }

  return {
    success: true,
    provider: "fleexa",
    products: extractArray(data)
  };
}

async function fleexaEmailDomains(site) {
  const response = await fetch(
    `${FLEEXA_BASE}/email/domains?site=${encodeURIComponent(
      site
    )}`,
    {
      method: "GET",
      headers: authHeaders(FLEEXA_KEY)
    }
  );

  const data = await readJson(response);

  if (!response.ok) {
    throw new Error(
      `Fleexa email domains request failed (${response.status}).`
    );
  }

  return {
    success: true,
    provider: "fleexa",
    domains: extractArray(data)
  };
}

async function fleexaEmailBuy({
  base44,
  wallet,
  walletBalance,
  userEmail,
  domain,
  site
}) {
  const response = await fetch(
    `${FLEEXA_BASE}/email/buy`,
    {
      method: "POST",
      headers: authHeaders(FLEEXA_KEY, true),
      body: JSON.stringify({
        domain,
        site
      })
    }
  );

  const data = await readJson(response);

  if (
    !response.ok ||
    data?.success !== true
  ) {
    throw new Error(
      data?.message ||
        data?.error ||
        `Fleexa email purchase failed (${response.status}).`
    );
  }

  const purchase = data?.data || data;

  const email = clean(
    purchase?.email ||
      purchase?.address
  );

  const emailId = clean(
    purchase?.emailId ||
      purchase?.email_id ||
      purchase?.id
  );

  const providerPrice = number(
    purchase?.amount_paid ||
      purchase?.price ||
      purchase?.cost
  );

  if (!email || !emailId) {
    throw new Error(
      "Fleexa email purchase succeeded but returned incomplete order data."
    );
  }

  if (!providerPrice || providerPrice <= 0) {
    throw new Error(
      "Fleexa email purchase returned no valid price."
    );
  }

  const charge = customerPrice(providerPrice);

  if (walletBalance < charge) {
    /*
     * Important:
     * We purchased from provider before checking our
     * wallet because the provider endpoint gives the
     * actual final amount.
     *
     * If your provider account allows cancellation here,
     * this is where a compensation/cancel flow should run.
     */
    throw new Error(
      `Insufficient wallet balance. Required ${charge} NGN, available ${walletBalance} NGN.`
    );
  }

  const rental = await base44.entities.Rental.create({
    userEmail,
    phoneNumber: email,
    orderId: `fleexa_email_${emailId}`,
    serverId: "a",
    country: "EMAIL",
    service: site,
    status: "waiting_email"
  });

  try {
    await chargeWallet(
      base44,
      wallet,
      walletBalance,
      charge
    );
  } catch (error) {
    console.error(
      "EMAIL WALLET UPDATE ERROR:",
      error
    );

    return {
      success: true,
      warning:
        "Email OTP was purchased and saved, but wallet update failed. Admin should reconcile this transaction.",
      email,
      emailId,
      rentalId: rental?.id,
      charged: charge
    };
  }

  return {
    success: true,
    provider: "fleexa",
    email,
    emailId,
    rentalId: rental?.id,
    service: site,
    domain,
    charged: charge,
    providerPrice,
    currency: "NGN"
  };
}

async function fleexaEmailCheck(emailId) {
  const response = await fetch(
    `${FLEEXA_BASE}/email/check/${encodeURIComponent(
      emailId
    )}`,
    {
      method: "GET",
      headers: authHeaders(FLEEXA_KEY)
    }
  );

  const data = await readJson(response);

  if (!response.ok) {
    throw new Error(
      `Fleexa email OTP check failed (${response.status}).`
    );
  }

  const result = data?.data || data;

  return {
    success: true,
    provider: "fleexa",
    status:
      result?.status ||
      result?.state ||
      "pending",
    code:
      result?.sms_code ||
      result?.code ||
      result?.otp ||
      "",
    message:
      result?.message ||
      result?.text ||
      result?.sms_text ||
      "",
    email:
      result?.email ||
      ""
  };
}

async function fleexaEmailCancel(emailId) {
  const response = await fetch(
    `${FLEEXA_BASE}/email/cancel`,
    {
      method: "POST",
      headers: authHeaders(FLEEXA_KEY, true),
      body: JSON.stringify({
        emailId
      })
    }
  );

  const data = await readJson(response);

  if (!response.ok) {
    throw new Error(
      data?.message ||
        data?.error ||
        `Fleexa email cancellation failed (${response.status}).`
    );
  }

  return {
    success: true,
    provider: "fleexa",
    response: data
  };
}

/* =========================================================
   FLEEXA RENT NUMBERS
========================================================= */

async function fleexaRentAreas() {
  const response = await fetch(
    `${FLEEXA_BASE}/rent/sms4/areas`,
    {
      method: "GET",
      headers: authHeaders(FLEEXA_KEY)
    }
  );

  const data = await readJson(response);

  if (!response.ok) {
    throw new Error(
      `Fleexa rental areas request failed (${response.status}).`
    );
  }

  return {
    success: true,
    provider: "fleexa",
    areas: extractArray(data)
  };
}

async function fleexaRentBuy({
  base44,
  wallet,
  walletBalance,
  userEmail,
  appName,
  months
}) {
  const time = String(months || 1);

  const response = await fetch(
    `${FLEEXA_BASE}/rent/sms4/buy`,
    {
      method: "POST",
      headers: authHeaders(FLEEXA_KEY, true),
      body: JSON.stringify({
        appName,
        time
      })
    }
  );

  const data = await readJson(response);

  if (
    !response.ok ||
    data?.success !== true
  ) {
    throw new Error(
      data?.message ||
        data?.error ||
        `Fleexa rental purchase failed (${response.status}).`
    );
  }

  const purchase = data?.data || data;

  const phone = clean(
    purchase?.number ||
      purchase?.phone
  );

  const rentalId = clean(
    purchase?.rental_id ||
      purchase?.rentalId ||
      purchase?.id
  );

  const orderId = clean(
    purchase?.order_id ||
      purchase?.orderId ||
      rentalId
  );

  const providerPrice = number(
    data?.cost_ngn ??
      purchase?.cost_ngn ??
      purchase?.price ??
      purchase?.amount
  );

  if (!phone || !rentalId) {
    throw new Error(
      "Fleexa rental purchase returned incomplete number data."
    );
  }

  if (!providerPrice || providerPrice <= 0) {
    throw new Error(
      "Fleexa rental purchase returned no valid price."
    );
  }

  const charge = customerPrice(providerPrice);

  if (walletBalance < charge) {
    throw new Error(
      `Insufficient wallet balance. Required ${charge} NGN, available ${walletBalance} NGN.`
    );
  }

  const rental = await base44.entities.Rental.create({
    userEmail,
    phoneNumber: phone,
    orderId: `fleexa_rent_${orderId}`,
    serverId: "a",
    country: "US",
    service: appName,
    status: "active"
  });

  try {
    await chargeWallet(
      base44,
      wallet,
      walletBalance,
      charge
    );
  } catch (error) {
    console.error(
      "FLEEXA RENT WALLET UPDATE ERROR:",
      error
    );

    return {
      success: true,
      warning:
        "Rental was purchased and saved, but wallet update failed. Admin should reconcile this transaction.",
      phone,
      rentalId,
      orderId,
      rentalRecordId: rental?.id,
      charged: charge
    };
  }

  return {
    success: true,
    provider: "fleexa",
    phone,
    rentalId,
    orderId,
    rentalRecordId: rental?.id,
    charged: charge,
    providerPrice,
    months: time,
    country: "US",
    countryName: "United States",
    currency: "NGN"
  };
}

async function fleexaRentNumbers() {
  const response = await fetch(
    `${FLEEXA_BASE}/rent/sms4/numbers`,
    {
      method: "GET",
      headers: authHeaders(FLEEXA_KEY)
    }
  );

  const data = await readJson(response);

  if (!response.ok) {
    throw new Error(
      `Fleexa active rentals request failed (${response.status}).`
    );
  }

  return {
    success: true,
    provider: "fleexa",
    rentals: extractArray(data)
  };
}

async function fleexaRentSms(rentalId) {
  const response = await fetch(
    `${FLEEXA_BASE}/rent/sms4/sms?rentalId=${encodeURIComponent(
      rentalId
    )}`,
    {
      method: "GET",
      headers: authHeaders(FLEEXA_KEY)
    }
  );

  const data = await readJson(response);

  if (!response.ok) {
    throw new Error(
      `Fleexa rental SMS request failed (${response.status}).`
    );
  }

  return {
    success: true,
    provider: "fleexa",
    rentalId,
    messages: extractArray(data),
    data
  };
}

/* =========================================================
   SMSPOOL
===============

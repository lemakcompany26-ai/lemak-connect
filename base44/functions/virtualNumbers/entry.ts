import { createClientFromRequest } from "npm:@base44/sdk";

/*
=========================================================
LEMAK CONNECT - VIRTUAL NUMBERS BACKEND
=========================================================

SUPPORTED ACTIONS

catalog
services
countries
price
order
checkOtp
cancel

SERVER 1 = Fleexa
SERVER 2 = SMSPool

API KEYS NEVER GO TO THE FRONTEND.
=========================================================
*/


/*
=========================================================
ENVIRONMENT
=========================================================
*/

const FLEEXA_BASE =
  (
    Deno.env.get("FLEEXA_API_URL") ||
    "https://fleexa.com.ng/developer"
  ).replace(/\/+$/, "");

const FLEEXA_KEY =
  Deno.env.get("FLEEXA_API_KEY") || "";

const SMSPOOL_BASE =
  (
    Deno.env.get("SMSPOOL_API_URL") ||
    "https://api.smspool.net"
  ).replace(/\/+$/, "");

const SMSPOOL_KEY =
  Deno.env.get("SMSPOOL_API_KEY") || "";

const USD_NGN_RATE =
  Number(
    Deno.env.get("SMSPOOL_USD_NGN_RATE") ||
      "1600"
  );

const MARKUP_PERCENT =
  Number(
    Deno.env.get(
      "VIRTUAL_NUMBER_MARKUP_PERCENT"
    ) || "30"
  );


/*
=========================================================
GENERAL HELPERS
=========================================================
*/

function json(data, status = 200) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "Content-Type, Authorization",
        "Access-Control-Allow-Methods":
          "GET, POST, OPTIONS"
      }
    }
  );
}


function clean(value) {
  return String(value ?? "").trim();
}


function num(value, fallback = 0) {
  const n = Number(value);

  return Number.isFinite(n)
    ? n
    : fallback;
}


function customerPrice(providerPrice) {
  const price = num(providerPrice);

  if (price <= 0) {
    return 0;
  }

  return Math.ceil(
    price *
      (1 + MARKUP_PERCENT / 100)
  );
}


function usdToNaira(value) {
  const usd = num(value);

  if (usd <= 0) {
    return 0;
  }

  return usd * USD_NGN_RATE;
}


function fleexaHeaders(
  jsonContent = false
) {
  const headers = {
    Authorization:
      `Bearer ${FLEEXA_KEY}`,
    "X-API-Key":
      FLEEXA_KEY
  };

  if (jsonContent) {
    headers["Content-Type"] =
      "application/json";
  }

  return headers;
}


async function readResponse(response) {
  const text =
    await response.text();

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


function getArray(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  if (Array.isArray(data?.results)) {
    return data.results;
  }

  if (Array.isArray(data?.services)) {
    return data.services;
  }

  if (Array.isArray(data?.countries)) {
    return data.countries;
  }

  if (Array.isArray(data?.items)) {
    return data.items;
  }

  if (Array.isArray(data?.apps)) {
    return data.apps;
  }

  return [];
}


function getProviderError(
  data,
  fallback
) {
  return clean(
    data?.message ||
    data?.error ||
    data?.type ||
    data?.msg ||
    data?.raw ||
    fallback
  );
}


/*
=========================================================
WALLET
=========================================================
*/

async function getWallet(
  base44,
  userEmail
) {
  if (!userEmail) {
    throw new Error(
      "User email is required."
    );
  }

  const wallets =
    await base44.entities.Wallet.filter({
      userEmail
    });

  const wallet =
    wallets?.[0];

  if (!wallet) {
    throw new Error(
      "Wallet not found for this account."
    );
  }

  return {
    wallet,
    balance:
      num(wallet.balance)
  };
}


async function updateWallet(
  base44,
  wallet,
  newBalance
) {
  await base44.entities.Wallet.update(
    wallet.id,
    {
      balance:
        Number(newBalance)
    }
  );
}


/*
=========================================================
FLEEXA
=========================================================
*/


function extractFleexaPrice(data) {
  if (Array.isArray(data)) {
    const first =
      data[0];

    return num(
      first?.price_ngn ??
      first?.rate ??
      first?.price ??
      first?.cost ??
      first?.amount
    );
  }

  if (
    data?.data &&
    typeof data.data ===
      "object" &&
    !Array.isArray(data.data)
  ) {
    return num(
      data.data?.price_ngn ??
      data.data?.rate ??
      data.data?.price ??
      data.data?.cost ??
      data.data?.amount
    );
  }

  return num(
    data?.price_ngn ??
    data?.rate ??
    data?.price ??
    data?.cost ??
    data?.amount
  );
}


/*
---------------------------------------------------------
FLEEXA SERVICES
---------------------------------------------------------
*/

async function fleexaServices() {
  if (!FLEEXA_KEY) {
    throw new Error(
      "Server 1 is not configured. FLEEXA_API_KEY is missing."
    );
  }

  const response =
    await fetch(
      `${FLEEXA_BASE}/sms4/apps`,
      {
        method: "GET",
        headers:
          fleexaHeaders()
      }
    );

  const data =
    await readResponse(
      response
    );

  if (!response.ok) {
    throw new Error(
      `Server 1 services request failed (${response.status}): ${getProviderError(
        data,
        "Provider error"
      )}`
    );
  }

  let list =
    getArray(data);

  /*
   * Handle object-map responses.
   */
  if (
    list.length === 0 &&
    data &&
    typeof data ===
      "object"
  ) {
    const possible =
      data.data ||
      data.apps ||
      data.services;

    if (
      possible &&
      typeof possible ===
        "object" &&
      !Array.isArray(possible)
    ) {
      list =
        Object.entries(
          possible
        ).map(
          ([id, value]) => ({
            id,
            name:
              typeof value ===
                "string"
                ? value
                : value?.name ||
                  value?.serviceName ||
                  id,
            ...(typeof value ===
            "object"
              ? value
              : {})
          })
        );
    }
  }

  const services =
    list
      .map((item) => {
        if (
          typeof item ===
          "string"
        ) {
          return {
            id: item,
            realId: item,
            name: item,
            provider:
              "fleexa",
            serverId: "a",
            country:
              "US",
            countryProviderId:
              "US",
            countryName:
              "United States"
          };
        }

        const id =
          clean(
            item?.serviceName ??
            item?.service ??
            item?.id ??
            item?.code ??
            item?.slug
          );

        const name =
          clean(
            item?.name ??
            item?.serviceName ??
            item?.service ??
            id
          );

        return {
          id,
          realId: id,
          name,
          provider:
            "fleexa",
          serverId: "a",
          country:
            "US",
          countryProviderId:
            "US",
          countryName:
            "United States"
        };
      })
      .filter(
        (item) =>
          item.id
      );

  services.sort(
    (a, b) => {
      const aw =
        a.name
          .toLowerCase()
          .includes("whatsapp");

      const bw =
        b.name
          .toLowerCase()
          .includes("whatsapp");

      if (
        aw &&
        !bw
      ) {
        return -1;
      }

      if (
        bw &&
        !aw
      ) {
        return 1;
      }

      return a.name.localeCompare(
        b.name
      );
    }
  );

  return services;
}


/*
---------------------------------------------------------
FLEEXA PRICE
---------------------------------------------------------
*/

async function fleexaPrice(
  service
) {
  if (!FLEEXA_KEY) {
    throw new Error(
      "Server 1 is not configured. FLEEXA_API_KEY is missing."
    );
  }

  const serviceName =
    clean(service);

  if (!serviceName) {
    throw new Error(
      "A service is required."
    );
  }

  const response =
    await fetch(
      `${FLEEXA_BASE}/sms4/prices?serviceName=${encodeURIComponent(
        serviceName
      )}`,
      {
        method: "GET",
        headers:
          fleexaHeaders()
      }
    );

  const data =
    await readResponse(
      response
    );

  if (!response.ok) {
    throw new Error(
      `Server 1 price request failed (${response.status}): ${getProviderError(
        data,
        "Provider error"
      )}`
    );
  }

  const providerPrice =
    extractFleexaPrice(
      data
    );

  if (
    providerPrice <= 0
  ) {
    throw new Error(
      `No live price is currently available for ${serviceName}.`
    );
  }

  return {
    providerPrice,
    customerPrice:
      customerPrice(
        providerPrice
      ),
    currency:
      "NGN",
    available:
      true
  };
}


/*
---------------------------------------------------------
FLEEXA BUY
---------------------------------------------------------
*/

async function fleexaBuy({
  base44,
  userEmail,
  service,
  country
}) {
  const pricing =
    await fleexaPrice(
      service
    );

  const {
    wallet,
    balance
  } =
    await getWallet(
      base44,
      userEmail
    );

  const charge =
    pricing.customerPrice;

  if (
    balance <
    charge
  ) {
    throw new Error(
      `Insufficient wallet balance. Required ₦${charge.toLocaleString()}, available ₦${balance.toLocaleString()}.`
    );
  }

  /*
   * Reserve customer's wallet
   * before provider purchase.
   */
  await updateWallet(
    base44,
    wallet,
    balance -
      charge
  );

  let response;
  let data;

  try {
    response =
      await fetch(
        `${FLEEXA_BASE}/sms4/buy`,
        {
          method:
            "POST",
          headers:
            fleexaHeaders(
              true
            ),
          body:
            JSON.stringify({
              serviceName:
                service,
              maxPrice:
                String(
                  pricing.providerPrice
                )
            })
        }
      );

    data =
      await readResponse(
        response
      );
  } catch (error) {
    try {
      await updateWallet(
        base44,
        wallet,
        balance
      );
    } catch {}

    throw new Error(
      `Could not contact Server 1: ${
        error?.message ||
        "network error"
      }`
    );
  }

  if (
    !response.ok ||
    data?.success !==
      true
  ) {
    try {
      await updateWallet(
        base44,
        wallet,
        balance
      );
    } catch {}

    throw new Error(
      getProviderError(
        data,
        `Server 1 rejected the purchase (${response.status}).`
      )
    );
  }

  const purchase =
    data?.data ||
    data;

  const phone =
    clean(
      purchase?.phone ||
      purchase?.number
    );

  const activationId =
    clean(
      purchase?.activation_id ||
      purchase?.requestId ||
      purchase?.id
    );

  if (!phone) {
    try {
      await updateWallet(
        base44,
        wallet,
        balance
      );
    } catch {}

    throw new Error(
      "Server 1 accepted the purchase but returned no phone number."
    );
  }

  if (!activationId) {
    try {
      await updateWallet(
        base44,
        wallet,
        balance
      );
    } catch {}

    throw new Error(
      "Server 1 returned a number but no activation ID. Your wallet has been refunded."
    );
  }

  let rental;

  try {
    rental =
      await base44.entities.Rental.create(
        {
          userEmail,
          phoneNumber:
            phone,
          orderId:
            `fleexa_${activationId}`,
          providerOrderId:
            activationId,
          serverId:
            "a",
          country:
            country ||
            "US",
          service,
          status:
            "waiting_sms"
        }
      );
  } catch (error) {
    console.error(
      "SERVER 1 RENTAL SAVE ERROR:",
      error
    );

    /*
     * Number is already purchased.
     * Do NOT refund wallet here because
     * the provider already supplied it.
     */
    return {
      success:
        true,
      providerPurchased:
        true,
      warning:
        "The number was purchased, but the rental record could not be saved. Contact admin before making another purchase.",
      phone,
      orderId:
        `fleexa_${activationId}`,
      charged:
        charge,
      providerPrice:
        pricing.providerPrice
    };
  }

  return {
    success:
      true,
    provider:
      "fleexa",
    serverId:
      "a",
    phone,
    orderId:
      `fleexa_${activationId}`,
    rentalId:
      rental?.id,
    charged:
      charge,
    providerPrice:
      pricing.providerPrice,
    currency:
      "NGN",
    country:
      "US",
    countryName:
      "United States"
  };
}


/*
---------------------------------------------------------
FLEEXA CHECK OTP
---------------------------------------------------------
*/

async function fleexaCheck(
  requestId
) {
  if (!requestId) {
    throw new Error(
      "Fleexa request ID is missing."
    );
  }

  const response =
    await fetch(
      `${FLEEXA_BASE}/sms4/check/${encodeURIComponent(
        requestId
      )}`,
      {
        method:
          "GET",
        headers:
          fleexaHeaders()
      }
    );

  const data =
    await readResponse(
      response
    );

  if (!response.ok) {
    throw new Error(
      `Server 1 OTP check failed (${response.status}): ${getProviderError(
        data,
        "Provider error"
      )}`
    );
  }

  const result =
    data?.data ||
    data;

  return {
    success:
      true,
    provider:
      "fleexa",
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


/*
---------------------------------------------------------
FLEEXA CANCEL
---------------------------------------------------------
*/

async function fleexaCancel(
  requestId
) {
  if (!requestId) {
    throw new Error(
      "Fleexa request ID is missing."
    );
  }

  const response =
    await fetch(
      `${FLEEXA_BASE}/sms4/cancel`,
      {
        method:
          "POST",
        headers:
          fleexaHeaders(
            true
          ),
        body:
          JSON.stringify({
            requestId
          })
      }
    );

  const data =
    await readResponse(
      response
    );

  if (!response.ok) {
    throw new Error(
      getProviderError(
        data,
        `Server 1 cancellation failed (${response.status}).`
      )
    );
  }

  return {
    success:
      true,
    provider:
      "fleexa",
    response:
      data
  };
}


/*
=========================================================
SMSPOOL HELPERS
=========================================================
*/


async function smsPoolPost(
  path,
  params = {}
) {
  if (!SMSPOOL_KEY) {
    throw new Error(
      "Server 2 is not configured. SMSPOOL_API_KEY is missing."
    );
  }

  const form =
    new URLSearchParams();

  form.set(
    "key",
    SMSPOOL_KEY
  );

  for (
    const [key, value]
    of Object.entries(
      params
    )
  ) {
    if (
      value !==
        undefined &&
      value !==
        null &&
      value !==
        ""
    ) {
      form.set(
        key,
        String(value)
      );
    }
  }

  let response;

  try {
    response =
      await fetch(
        `${SMSPOOL_BASE}${path}`,
        {
          method:
            "POST",
          headers: {
            "Content-Type":
              "application/x-www-form-urlencoded"
          },
          body:
            form.toString()
        }
      );
  } catch (error) {
    throw new Error(
      `Could not contact Server 2: ${
        error?.message ||
        "network error"
      }`
    );
  }

  const data =
    await readResponse(
      response
    );

  if (!response.ok) {
    throw new Error(
      `Server 2 request failed (${response.status}): ${getProviderError(
        data,
        "Provider error"
      )}`
    );
  }

  return data;
}


/*
=========================================================
SMSPOOL SERVICES
=========================================================
*/

function normalizeSmsPoolServices(
  data
) {
  /*
   * SMSPool's compatible stub
   * can return an object keyed
   * by service ID.
   */
  if (
    data &&
    typeof data ===
      "object" &&
    !Array.isArray(data)
  ) {
    const source =
      data.services ||
      data.data ||
      data;

    if (
      source &&
      typeof source ===
        "object" &&
      !Array.isArray(source)
    ) {
      return Object.entries(
        source
      )
        .map(
          ([id, value]) => {
            const name =
              typeof value ===
                "string"
                ? value
                : value?.name ||
                  value?.service_name ||
                  value?.service ||
                  id;

            return {
              id:
                clean(id),
              realId:
                clean(id),
              name:
                clean(name),
              provider:
                "smspool",
              serverId:
                "b"
            };
          }
        )
        .filter(
          (item) =>
            item.id
        );
    }
  }

  return getArray(data)
    .map((item) => {
      if (
        typeof item ===
        "string"
      ) {
        return {
          id:
            item,
          realId:
            item,
          name:
            item,
          provider:
            "smspool",
          serverId:
            "b"
        };
      }

      const id =
        clean(
          item?.service ??
          item?.service_id ??
          item?.id ??
          item?.code
        );

      const name =
        clean(
          item?.name ??
          item?.service_name ??
          item?.service ??
          id
        );

      return {
        id,
        realId:
          id,
        name,
        provider:
          "smspool",
        serverId:
          "b"
      };
    })
    .filter(
      (item) =>
        item.id
    );
}


/*
---------------------------------------------------------
SMSPOOL SERVICES
---------------------------------------------------------
*/

async function smsPoolServices() {
  if (!SMSPOOL

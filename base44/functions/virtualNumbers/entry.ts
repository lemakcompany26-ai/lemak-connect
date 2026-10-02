import { createClientFromRequest } from "npm:@base44/sdk";

/*
=========================================================
ENVIRONMENT
=========================================================
*/

const FLEEXA_BASE =
  Deno.env.get("FLEEXA_API_URL") ||
  "https://fleexa.com.ng/developer";

const FLEEXA_KEY =
  Deno.env.get("FLEEXA_API_KEY") || "";

const SMSPOOL_BASE =
  Deno.env.get("SMSPOOL_API_URL") ||
  "https://api.smspool.net";

const SMSPOOL_KEY =
  Deno.env.get("SMSPOOL_API_KEY") || "";

const USD_NGN_RATE = Number(
  Deno.env.get("SMSPOOL_USD_NGN_RATE") || "1600"
);

const MARKUP_PERCENT = Number(
  Deno.env.get("VIRTUAL_NUMBER_MARKUP_PERCENT") || "30"
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
        "Cache-Control": "no-store"
      }
    }
  );
}

function clean(value) {
  return String(value ?? "").trim();
}

function num(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function customerPrice(providerPrice) {
  return Math.ceil(
    num(providerPrice) *
      (1 + MARKUP_PERCENT / 100)
  );
}

function fleexaHeaders(jsonContent = false) {
  const headers = {
    Authorization: `Bearer ${FLEEXA_KEY}`,
    "X-API-Key": FLEEXA_KEY
  };

  if (jsonContent) {
    headers["Content-Type"] =
      "application/json";
  }

  return headers;
}

function smsPoolForm() {
  const form = new URLSearchParams();
  form.set("key", SMSPOOL_KEY);
  return form;
}

async function readResponse(response) {
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

  if (Array.isArray(data?.apps)) {
    return data.apps;
  }

  if (Array.isArray(data?.items)) {
    return data.items;
  }

  return [];
}

/*
=========================================================
PRICE EXTRACTION
=========================================================
*/

function extractFleexaPrice(data) {
  if (Array.isArray(data)) {
    const first = data[0];

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
    typeof data.data === "object"
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
=========================================================
WALLET
=========================================================
*/

async function getWallet(
  base44,
  userEmail
) {
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
    balance: num(wallet.balance)
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
      balance: newBalance
    }
  );
}

/*
=========================================================
FLEEXA SERVICES
=========================================================
*/

async function fleexaServices() {
  if (!FLEEXA_KEY) {
    throw new Error(
      "FLEEXA_API_KEY is missing from Base44 Secrets."
    );
  }

  const response =
    await fetch(
      `${FLEEXA_BASE}/sms4/apps`,
      {
        method: "GET",
        headers: fleexaHeaders()
      }
    );

  const data =
    await readResponse(response);

  if (!response.ok) {
    throw new Error(
      `Fleexa services request failed (${response.status}).`
    );
  }

  let list = getArray(data);

  /*
   * Some APIs can return an object map.
   */
  if (
    list.length === 0 &&
    data &&
    typeof data === "object"
  ) {
    const possible =
      data.data ||
      data.apps ||
      data.services;

    if (
      possible &&
      typeof possible === "object" &&
      !Array.isArray(possible)
    ) {
      list = Object.entries(
        possible
      ).map(([id, value]) => ({
        id,
        name:
          typeof value === "string"
            ? value
            : value?.name || id,
        ...(
          typeof value === "object"
            ? value
            : {}
        )
      }));
    }
  }

  const services =
    list
      .map((item) => {
        if (
          typeof item === "string"
        ) {
          return {
            id: item,
            realId: item,
            name: item,
            provider: "fleexa",
            serverId: "a",
            country: "US",
            countryProviderId: "US",
            countryName:
              "United States"
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
          countryProviderId: "US",
          countryName:
            "United States"
        };
      })
      .filter(
        (item) => item.id
      );

  /*
   * WhatsApp first.
   */
  services.sort(
    (a, b) => {
      const aWhatsApp =
        a.name
          .toLowerCase()
          .includes("whatsapp");

      const bWhatsApp =
        b.name
          .toLowerCase()
          .includes("whatsapp");

      if (
        aWhatsApp &&
        !bWhatsApp
      ) {
        return -1;
      }

      if (
        !aWhatsApp &&
        bWhatsApp
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
=========================================================
FLEEXA PRICE
=========================================================
*/

async function fleexaPrice(
  service
) {
  if (!FLEEXA_KEY) {
    throw new Error(
      "FLEEXA_API_KEY is missing from Base44 Secrets."
    );
  }

  const response =
    await fetch(
      `${FLEEXA_BASE}/sms4/prices?serviceName=${encodeURIComponent(
        service
      )}`,
      {
        method: "GET",
        headers: fleexaHeaders()
      }
    );

  const data =
    await readResponse(response);

  if (!response.ok) {
    throw new Error(
      `Fleexa price request failed (${response.status}).`
    );
  }

  const providerPrice =
    extractFleexaPrice(data);

  if (
    providerPrice <= 0
  ) {
    throw new Error(
      `Fleexa returned no valid price for service "${service}".`
    );
  }

  return {
    providerPrice,
    customerPrice:
      customerPrice(
        providerPrice
      ),
    currency: "NGN",
    available: true
  };
}

/*
=========================================================
FLEEXA BUY
=========================================================
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
  } = await getWallet(
    base44,
    userEmail
  );

  const charge =
    pricing.customerPrice;

  if (
    balance < charge
  ) {
    throw new Error(
      `Insufficient wallet balance. Required ₦${charge.toLocaleString()}, available ₦${balance.toLocaleString()}.`
    );
  }

  /*
   * Reserve the user's money BEFORE
   * purchasing from provider.
   */
  await updateWallet(
    base44,
    wallet,
    balance - charge
  );

  let response;
  let data;

  try {
    response =
      await fetch(
        `${FLEEXA_BASE}/sms4/buy`,
        {
          method: "POST",
          headers:
            fleexaHeaders(true),
          body: JSON.stringify({
            serviceName: service,
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
    /*
     * Refund our wallet reservation
     * if provider request itself failed.
     */
    await updateWallet(
      base44,
      wallet,
      balance
    );

    throw new Error(
      `Could not contact Fleexa: ${
        error?.message ||
        "network error"
      }`
    );
  }

  if (
    !response.ok ||
    data?.success !== true
  ) {
    /*
     * Refund user wallet if provider
     * rejects the purchase.
     */
    try {
      await updateWallet(
        base44,
        wallet,
        balance
      );
    } catch (refundError) {
      console.error(
        "FLEEXA WALLET REFUND ERROR:",
        refundError
      );
    }

    throw new Error(
      data?.message ||
        data?.error ||
        `Fleexa rejected the purchase (${response.status}).`
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
    /*
     * Refund if provider did not return
     * a usable number.
     */
    try {
      await updateWallet(
        base44,
        wallet,
        balance
      );
    } catch {}

    throw new Error(
      "Fleexa accepted the purchase but returned no phone number."
    );
  }

  if (!activationId) {
    throw new Error(
      "Fleexa returned the phone number but no activation ID. Contact admin before trying again."
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
          serverId: "a",
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
      "FLEEXA RENTAL SAVE ERROR:",
      error
    );

    return {
      success: true,
      warning:
        "The number was purchased, but Lemak Connect could not save the rental record. Contact admin before making another purchase.",
      providerPurchased:
        true,
      phone,
      orderId:
        `fleexa_${activationId}`,
      charged: charge
    };
  }

  return {
    success: true,
    provider: "fleexa",
    serverId: "a",
    phone,
    orderId:
      `fleexa_${activationId}`,
    rentalId:
      rental?.id,
    charged: charge,
    providerPrice:
      pricing.providerPrice,
    currency: "NGN",
    country: "US",
    countryName:
      "United States"
  };
}

/*
=========================================================
FLEEXA CHECK OTP
=========================================================
*/

async function fleexaCheck(
  requestId
) {
  const response =
    await fetch(
      `${FLEEXA_BASE}/sms4/check/${encodeURIComponent(
        requestId
      )}`,
      {
        method: "GET",
        headers: fleexaHeaders()
      }
    );

  const data =
    await readResponse(
      response
    );

  if (!response.ok) {
    throw new Error(
      `Fleexa OTP check failed (${response.status}).`
    );
  }

  const result =
    data?.data ||
    data;

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

/*
=========================================================
FLEEXA CANCEL
=========================================================
*/

async function fleexaCancel(
  requestId
) {
  const response =
    await fetch(
      `${FLEEXA_BASE}/sms4/cancel`,
      {
        method: "POST",
        headers:
          fleexaHeaders(true),
        body: JSON.stringify({
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

/*
=========================================================
SMSPOOL STUB
=========================================================
*/

async function smsPoolStub(
  params
) {
  if (!SMSPOOL_KEY) {
    throw new Error(
      "SMSPOOL_API_KEY is missing from Base44 Secrets."
    );
  }

  const url =
    `${SMSPOOL_BASE}/stubs/handler_api`;

  const form =
    new URLSearchParams();

  form.set(
    "key",
    SMSPOOL_KEY
  );

  for (
    const [key, value] of
    Object.entries(params)
  ) {
    if (
      value !== undefined &&
      value !== null
    ) {
      form.set(
        key,
        String(value)
      );
    }
  }

  form.set(
    "setting",
    "smspool"
  );

  const response =
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded"
      },
      body:
        form.toString()
    });

  const text =
    await response.text();

  let data;

  try {
    data =
      JSON.parse(text);
  } catch {
    data = {
      raw: text
    };
  }

  if (!response.ok) {
    throw new Error(
      `SMSPool request failed (${response.status}).`
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
   * SMSPool's compatible API can return
   * an object keyed by service ID.
   */
  if (
    data &&
    typeof data === "object" &&
    !Array.isArray(data)
  ) {
    const source =
      data.services ||
      data.data ||
      data;

    if (
      source &&
      typeof source === "object" &&
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
              id: clean(id),
              realId: clean(id),
              name: clean(name),
              provider:
                "smspool",
              serverId: "b"
            };
          }
        )
        .filter(
          (item) => item.id
        );
    }
  }

  const array =
    getArray(data);

  return array
    .map((item) => {
      if (
        typeof item === "string"
      ) {
        return {
          id: item,
          realId: item,
          name: item,
          provider:
            "smspool",
          serverId: "b"
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
        realId: id,
        name,
        provider:
          "smspool",
        serverId: "b"
      };
    })
    .filter(
      (item) => item.id
    );
}

async function smsPoolServices() {
  const data =
    await smsPoolStub({
      action:
        "getServicesList"
    });

  const services =
    normalizeSmsPoolServices(
      data
    );

  if (
    services.length === 0
  ) {
    throw new Error(
      "SMSPool returned no available services."
    );
  }

  services.sort(
    (a, b) =>
      a.name.localeCompare(
        b.name
      )
  );

  return services;
}

/*
=========================================================
SMSPOOL COUNTRIES
=========================================================
*/

function normalizeSmsPoolCountries(
  data
) {
  if (
    data &&
    typeof data === "object" &&
    !Array.isArray(data)
  ) {
    const source =
      data.countries ||
      data.data ||
      data;

    if (
      source &&
      typeof source === "object" &&
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
                  value?.country_name ||
                  value?.country ||
                  id;

            const code =
              typeof value ===
                "object"
                ? clean(
                    value?.iso ||
                      value?.iso2 ||
                      value?.country_code ||
                      ""
                  )
                : "";

            return {
              id: clean(id),
              providerId:
                clean(id),
              name: clean(name),
              code
            };
          }
        )
        .filter(
          (item) => item.id
        );
    }
  }

  return getArray(data)
    .map((item) => {
      if (
        typeof item === "string"
      ) {
        return {
          id: item,
          providerId: item,
          name: item,
          code: item
        };
      }

      const id =
        clean(
          item?.country ??
            item?.country_id ??
            item?.id ??
            item?.code
        );

      const name =
        clean(
          item?.name ??
            item?.country_name ??
            item?.country ??
            id
        );

      const code =
        clean(
          item?.iso ||
            item?.iso2 ||
            item?.country_code ||
            ""
        );

      return {
        id,
        providerId: id,
        name,
        code
      };
    })
    .filter(
      (item) => item.id
    );
}

async function smsPoolCountries() {
  const data =
    await smsPoolStub({
      action:
        "getCountriesList"
    });

  const countries =
    normalizeSmsPoolCountries(
      data
    );

  if (
    countries.length === 0
  ) {
    throw new Error(
      "SMSPool returned no available countries."
    );
  }

  countries.sort(
    (a, b) =>
      a.name.localeCompare(
        b.name
      )
  );

  return countries;
}

/*
=========================================================
SMSPOOL PRICE
=========================================================
*/

async function smsPoolPrice({
  service,
  country
}) {
  if (!SMSPOOL_KEY) {
    throw new Error(
      "SMSPOOL_API_KEY is missing from Base44 Secrets."
    );
  }

  const form =
    new URLSearchParams();

  form.set(
    "key",
    SMSPOOL_KEY
  );

  form.set(
    "service",
    String(service)
  );

  form.set(
    "country",
    String(country)
  );

  const response =
    await fetch(
      `${SMSPOOL_BASE}/request/price`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded"
        },
        body:
          form.toString()
      }
    );

  const data =
    await readResponse(
      response
    );

  

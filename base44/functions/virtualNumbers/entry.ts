import { createClient } from "npm:@base44/sdk@0.1.2";

const base44 = createClient({
  appId: Deno.env.get("BASE44_APP_ID")!,
  apiKey: Deno.env.get("BASE44_API_KEY")!,
});

const FLEEXA_BASE =
  Deno.env.get("FLEEXA_API_URL") ||
  "https://fleexa.com.ng/developer";

const FLEEXA_KEY = Deno.env.get("FLEEXA_API_KEY") || "";

const SMSPOOL_BASE = "https://api.smspool.net";
const SMSPOOL_KEY = Deno.env.get("SMSPOOL_API_KEY") || "";

// Used only for converting SMSPool USD prices to NGN.
// Add SMSPOOL_USD_NGN_RATE in Base44 Secrets if you want to change it.
const SMSPOOL_USD_NGN_RATE =
  Number(Deno.env.get("SMSPOOL_USD_NGN_RATE") || "1600");

// Your server-side markup.
// 30% means provider cost x 1.30.
const MARKUP = 1.30;

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function response(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers,
  });
}

function money(value: any) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function customerPrice(providerPrice: number) {
  return Math.ceil(providerPrice * MARKUP);
}

async function readJson(res: Response) {
  return await res.json().catch(() => ({}));
}

function arrayFrom(data: any): any[] {
  if (Array.isArray(data)) return data;

  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.data)) return data.data.data;
  if (Array.isArray(data?.data?.services)) return data.data.services;
  if (Array.isArray(data?.data?.countries)) return data.data.countries;
  if (Array.isArray(data?.services)) return data.services;
  if (Array.isArray(data?.countries)) return data.countries;
  if (Array.isArray(data?.apps)) return data.apps;

  return [];
}

function extractSuccess(data: any) {
  return (
    data?.success === true ||
    data?.success === 1 ||
    data?.success === "1"
  );
}

/* =========================================================
   FLEEXA
========================================================= */

async function fleexaHeaders() {
  return {
    Authorization: `Bearer ${FLEEXA_KEY}`,
    "X-API-Key": FLEEXA_KEY,
    "Content-Type": "application/json",
  };
}

async function fleexaApps() {
  const r = await fetch(`${FLEEXA_BASE}/sms4/apps`, {
    headers: await fleexaHeaders(),
  });

  const data = await readJson(r);

  if (!r.ok) {
    throw new Error(
      `Fleexa services error ${r.status}: ${JSON.stringify(data)}`
    );
  }

  return arrayFrom(data);
}

async function fleexaPrice(serviceName: string) {
  const url =
    `${FLEEXA_BASE}/sms4/prices?serviceName=` +
    encodeURIComponent(serviceName);

  const r = await fetch(url, {
    headers: await fleexaHeaders(),
  });

  const data = await readJson(r);

  if (!r.ok) {
    throw new Error(
      `Fleexa price error ${r.status}: ${JSON.stringify(data)}`
    );
  }

  const candidates = [
    data?.price_ngn,
    data?.rate,
    data?.price,
    data?.data?.price_ngn,
    data?.data?.rate,
    data?.data?.price,
    data?.data?.amount,
  ];

  const price = candidates
    .map(money)
    .find((v) => v > 0);

  if (!price) {
    throw new Error(
      `No Fleexa price returned for ${serviceName}`
    );
  }

  return price;
}

/* =========================================================
   SMSPOOL
========================================================= */

async function smspoolForm(
  path: string,
  values: Record<string, any>
) {
  const form = new URLSearchParams();

  form.append("key", SMSPOOL_KEY);

  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== null && value !== "") {
      form.append(key, String(value));
    }
  }

  const r = await fetch(`${SMSPOOL_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SMSPOOL_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form,
  });

  return {
    response: r,
    data: await readJson(r),
  };
}

async function smsPoolServices() {
  // Current/standard SMSPool endpoint
  const first = await smspoolForm("/request/services", {});

  if (first.response.ok) {
    const arr = arrayFrom(first.data);
    if (arr.length) return arr;
  }

  // Compatibility fallback
  const second = await smspoolForm("/service/retrieve_all", {});

  if (second.response.ok) {
    const arr = arrayFrom(second.data);
    if (arr.length) return arr;
  }

  throw new Error(
    `SMSPool service list failed: ${JSON.stringify(
      first.data
    )}`
  );
}

async function smsPoolCountries() {
  // Current/standard endpoint
  const first = await smspoolForm("/request/countries", {});

  if (first.response.ok) {
    const arr = arrayFrom(first.data);
    if (arr.length) return arr;
  }

  // Compatibility fallback
  const second = await smspoolForm(
    "/country/retrieve_all",
    {}
  );

  if (second.response.ok) {
    const arr = arrayFrom(second.data);
    if (arr.length) return arr;
  }

  throw new Error(
    `SMSPool country list failed: ${JSON.stringify(
      first.data
    )}`
  );
}

async function smsPoolPrice(
  serviceId: string,
  countryId: string
) {
  // Documented SMSPool pricing endpoint.
  const first = await smspoolForm("/request/price", {
    service: serviceId,
    country: countryId,
  });

  let data = first.data;

  // Compatibility fallback for installations using the
  // alternate pricing endpoint.
  if (
    !first.response.ok ||
    data?.error ||
    data?.success === false
  ) {
    const second = await smspoolForm("/request/pricing", {
      service: serviceId,
      country: countryId,
    });

    data = second.data;
  }

  let price = 0;

  if (Array.isArray(data)) {
    price = money(
      data[0]?.price ??
        data[0]?.cost ??
        data[0]?.amount
    );
  } else {
    price = money(
      data?.price ??
        data?.cost ??
        data?.amount ??
        data?.data?.price ??
        data?.data?.cost
    );
  }

  if (!price) {
    throw new Error(
      `No SMSPool price for service ${serviceId} / country ${countryId}`
    );
  }

  return price;
}

/* =========================================================
   MAIN FUNCTION
========================================================= */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers,
    });
  }

  const body = await req.json().catch(() => ({}));
  const action = body.action || "provider_catalog";

  /* =======================================================
     1. PROVIDER CATALOG
  ======================================================= */

  if (action === "provider_catalog") {
    const servers: any[] = [];

    /* ---------------- FLEEXA SERVER ---------------- */

    try {
      if (!FLEEXA_KEY) {
        throw new Error("FLEEXA_API_KEY is missing");
      }

      const apps = await fleexaApps();

      const services = apps
        .map((item: any) => {
          const serviceName = String(
            item?.serviceName ??
              item?.name ??
              item?.service ??
              item?.id ??
              ""
          ).trim();

          if (!serviceName) return null;

          return {
            id: serviceName.toLowerCase(),
            name: serviceName,
            provider: "fleexa",
            realId: serviceName,
            available:
              item?.available ??
              item?.stock ??
              item?.count ??
              null,
          };
        })
        .filter(Boolean);

      servers.push({
        id: "a",
        name: "Server 1",
        provider: "fleexa",
        subtitle: "US Only - Real SIM",
        online: services.length > 0,
        smsStock: services.length,
        countries: [
          {
            code: "US",
            providerId: "US",
            name: "United States",
          },
        ],
        smsServices: services,
      });
    } catch (e) {
      console.error("FLEEXA CATALOG ERROR", e);

      servers.push({
        id: "a",
        name: "Server 1",
        provider: "fleexa",
        subtitle: "Fleexa unavailable",
        online: false,
        smsStock: 0,
        countries: [],
        smsServices: [],
        error: String(e),
      });
    }

    /* ---------------- SMSPOOL SERVER ---------------- */

    try {
      if (!SMSPOOL_KEY) {
        throw new Error("SMSPOOL_API_KEY is missing");
      }

      const [servicesRaw, countriesRaw] =
        await Promise.all([
          smsPoolServices(),
          smsPoolCountries(),
        ]);

      const services = servicesRaw
        .map((item: any) => {
          const name = String(
            item?.name ??
              item?.Name ??
              item?.service ??
              item?.serviceName ??
              ""
          ).trim();

          const realId = String(
            item?.ID ??
              item?.id ??
              item?.ID_service ??
              item?.service_id ??
              name
          );

          if (!name) return null;

          return {
            id: name.toLowerCase(),
            name,
            provider: "smspool",
            realId,
            available:
              item?.stock ??
              item?.available ??
              item?.count ??
              null,
          };
        })
        .filter(Boolean);

      const countries = countriesRaw
        .map((item: any) => {
          const code = String(
            item?.short_name ??
              item?.shortName ??
              item?.iso ??
              item?.code ??
              item?.country_code ??
              ""
          ).trim();

          const providerId = String(
            item?.ID ??
              item?.id ??
              item?.country_id ??
              code
          );

          const name = String(
            item?.name ??
              item?.Name ??
              item?.country ??
              code
          );

          if (!code && !providerId) return null;

          return {
            code: code || providerId,
            providerId,
            name,
          };
        })
        .filter(Boolean);

      servers.push({
        id: "b",
        name: "Server 2",
        provider: "smspool",
        subtitle: "All Countries",
        online: services.length > 0,
        smsStock: services.length,
        countries,
        smsServices: services,
      });
    } catch (e) {
      console.error("SMSPOOL CATALOG ERROR", e);

      servers.push({
        id: "b",
        name: "Server 2",
        provider: "smspool",
        subtitle: "SMSPool unavailable",
        online: false,
        smsStock: 0,
        countries: [],
        smsServices: [],
        error: String(e),
      });
    }

    return response({ servers });
  }

  /* =======================================================
     2. QUOTE
  ======================================================= */

  if (action === "quote") {
    try {
      const serverId = body.serverId;
      const service = String(
        body.service || ""
      );

      if (!service) {
        return response({
          prices: {},
          error: "Missing service",
        });
      }

      /* FLEEXA */

      if (serverId === "a") {
        const providerPrice = await fleexaPrice(
          body.realId || service
        );

        return response({
          prices: {
            [service]: {
              available: true,
              providerPrice,
              currency: "NGN",
              customerPrice:
                customerPrice(providerPrice),
              markupPercent: 30,
            },
          },
        });
      }

      /* SMSPOOL */

      if (serverId === "b") {
        const realId = String(
          body.realId || service
        );

        const countryProviderId = String(
          body.countryProviderId ||
            body.country ||
            "US"
        );

        const providerUsd = await smsPoolPrice(
          realId,
          countryProviderId
        );

        const providerNgn =
          providerUsd * SMSPOOL_USD_NGN_RATE;

        return response({
          prices: {
            [service]: {
              available: true,
              providerPrice: providerUsd,
              providerCurrency: "USD",
              providerPriceNgn: providerNgn,
              customerPrice:
                customerPrice(providerNgn),
              currency: "NGN",
              markupPercent: 30,
            },
          },
        });
      }

      return response({
        prices: {},
        error: "Unknown server",
      });
    } catch (e) {
      console.error("QUOTE ERROR", e);

      return response({
        prices: {},
        error: String(e),
      });
    }
  }

  /* =======================================================
     3. ORDER
  ======================================================= */

  if (action === "order") {
    try {
      const userEmail = String(
        body.userEmail || ""
      ).trim();

      if (!userEmail) {
        return response({
          success: false,
          error: "User email is required",
        }, 400);
      }

      const serverId = body.serverId;
      const service = String(
        body.service || ""
      );

      if (!service) {
        return response({
          success: false,
          error: "Service is required",
        }, 400);
      }

      /*
       * IMPORTANT:
       * Calculate the price again on the server.
       * Never trust body.price from the browser.
       */

      let finalCustomerPrice = 0;
      let providerCost = 0;

      let phone = "";
      let orderId = "";

      /* ---------------- FLEEXA ORDER ---------------- */

      if (serverId === "a") {
        const serviceName = String(
          body.realId || service
        );

        providerCost =
          await fleexaPrice(serviceName);

        finalCustomerPrice =
          customerPrice(providerCost);

        const [wallet] =
          await base44.entities.Wallet.filter({
            userEmail,
          });

        if (
          !wallet ||
          Number(wallet.balance) <
            finalCustomerPrice
        ) {
          return response({
            success: false,
            error: "Low wallet balance",
            required: finalCustomerPrice,
          });
        }

        const r = await fetch(
          `${FLEEXA_BASE}/sms4/buy`,
          {
            method: "POST",
            headers: await fleexaHeaders(),
            body: JSON.stringify({
              serviceName,
              maxPrice: String(providerCost),
            }),
          }
        );

        const data = await readJson(r);

        if (
          !r.ok ||
          !extractSuccess(data)
        ) {
          return response({
            success: false,
            error:
              data?.message ||
              data?.error ||
              JSON.stringify(data),
          });
        }

        const d =
          data?.data || data;

        phone =
          d?.phone ||
          d?.number ||
          "";

        orderId = String(
          d?.activation_id ??
            d?.id ??
            d?.requestId ??
            ""
        );

        if (!phone || !orderId) {
          return response({
            success: false,
            error:
              "Fleexa returned an invalid order response",
          });
        }

        await base44.entities.Wallet.update(
          wallet.id,
          {
            balance:
              Number(wallet.balance) -
              finalCustomerPrice,
          }
        );

        const rental =
          await base44.entities.Rental.create({
            userEmail,
            phoneNumber: phone,
            orderId: `fleexa_${orderId}`,
            serverId: "a",
            country: "US",
            service,
            status: "waiting_sms",
            customerPrice:
              finalCustomerPrice,
            providerPrice:
              providerCost,
          });

        return response({
          success: true,
          phone,
          orderId: `fleexa_${orderId}`,
          rentalId: rental.id,
          charged: finalCustomerPrice,
          providerPrice: providerCost,
        });
      }

      /* ---------------- SMSPOOL ORDER ---------------- */

      if (serverId === "b") {
        const realServiceId = String(
          body.realId || service
        );

        const countryProviderId =
          String(
            body.countryProviderId ||
              body.country ||
              "US"
          );

        providerCost =
          await smsPoolPrice(
            realServiceId,
            countryProviderId
          );

        const providerNgn =
          providerCost *
          SMSPOOL_USD_NGN_RATE;

        finalCustomerPrice =
          customerPrice(providerNgn);

        const [wallet] =
          await base44.entities.Wallet.filter({
            userEmail,
          });

        if (
          !wallet ||
          Number(wallet.balance) <
            finalCustomerPrice
        ) {
          return response({
            success: false,
            error: "Low wallet balance",
            required: finalCustomerPrice,
          });
        }

        const form =
          new URLSearchParams();

        form.append("key", SMSPOOL_KEY);
        form.append(
          "country",
          countryProviderId
        );
        form.append(
          "service",
          realServiceId
        );
        form.append("pool", "1");

        const r = await fetch(
          `${SMSPOOL_BASE}/purchase/sms`,
          {
            method: "POST",
            headers: {
              Authorization:
                `Bearer ${SMSPOOL_KEY}`,
              "Content-Type":
                "application/x-www-form-urlencoded",
            },
            body: form,
          }
        );

        const data = await readJson(r);

        if (
          !r.ok ||
          !extractSuccess(data)
        ) {
          return response({
            success: false,
            error:
              data?.message ||
              data?.type ||
              JSON.stringify(data),
          });
        }

        phone = String(
          data?.number ??
            data?.phonenumber ??
            ""
        );

        orderId = String(
          data?.order_id ?? ""
        );

        if (!phone || !orderId) {
          return response({
            success: false,
            error:
              "SMSPool returned no phone number/order ID",
          });
        }

        await base44.entities.Wallet.update(
          wallet.id,
          {
            balance:
              Number(wallet.balance) -
              finalCustomerPrice,
          }
        );

        const rental =
          await base44.entities.Rental.create({
            userEmail,
            phoneNumber: phone,
            orderId: `smspool_${orderId}`,
            serverId: "b",
            country:
              body.country || countryProviderId,
            service,
            status: "waiting_sms",
            customerPrice:
              finalCustomerPrice,
            providerPrice:
              providerCost,
          });

        return response({
          success: true,
          phone,
          orderId:
            `smspool_${orderId}`,
          rentalId: rental.id,
          charged: finalCustomerPrice,
          providerPrice:
            providerCost,
          providerCurrency: "USD",
        });
      }

      return response({
        success: false,
        error: "Unknown server",
      });
    } catch (e) {
      console.error("ORDER ERROR", e);

      return response({
        success: false,
        error: String(e),
      });
    }
  }

  /* =======================================================
     4. CHECK OTP
  ======================================================= */

  

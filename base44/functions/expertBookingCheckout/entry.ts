import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { secrets } from "base44:runtime";

const KORA_API =
  "https://api.korapay.com/merchant/api/v1";

function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function clean(value: unknown, max = 2000) {
  return String(value ?? "")
    .trim()
    .slice(0, max);
}

function safeNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number)
    ? number
    : 0;
}

function isValidDate(value: string) {
  if (!value) return false;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return date.getTime() > Date.now();
}

function safeCallback(
  callbackUrl: string,
  origin: string
) {
  try {
    const url = new URL(callbackUrl);

    return (
      url.origin === origin &&
      (url.protocol === "https:" ||
        url.hostname === "localhost")
    );
  } catch {
    return false;
  }
}

export default async function (
  req: Request
): Promise<Response> {
  try {
    if (req.method !== "POST") {
      return json(
        {
          ok: false,
          error: "Method not allowed.",
        },
        405
      );
    }

    const base44 =
      createClientFromRequest(req);

    const user =
      await base44.auth.me();

    if (!user) {
      return json(
        {
          ok: false,
          error:
            "Please sign in before booking a service.",
        },
        401
      );
    }

    let body: Record<string, any>;

    try {
      body = await req.json();
    } catch {
      return json(
        {
          ok: false,
          error: "Invalid request body.",
        },
        400
      );
    }

    const categoryId = clean(
      body.categoryId,
      100
    );

    const optionId = clean(
      body.optionId,
      100
    );

    const quantity = safeNumber(
      body.quantity
    );

    const bookingDate = clean(
      body.bookingDate,
      200
    );

    const location = clean(
      body.location,
      2000
    );

    const notes = clean(
      body.notes,
      3000
    );

    if (!categoryId || !optionId) {
      return json(
        {
          ok: false,
          error:
            "Please select a service.",
        },
        400
      );
    }

    if (
      !Number.isFinite(quantity) ||
      quantity < 1 ||
      quantity > 10000
    ) {
      return json(
        {
          ok: false,
          error:
            "Please enter a valid quantity.",
        },
        400
      );
    }

    if (!bookingDate) {
      return json(
        {
          ok: false,
          error:
            "Please select a booking date.",
        },
        400
      );
    }

    if (!isValidDate(bookingDate)) {
      return json(
        {
          ok: false,
          error:
            "Booking date must be in the future.",
        },
        400
      );
    }

    if (!location) {
      return json(
        {
          ok: false,
          error:
            "Please provide your location.",
        },
        400
      );
    }

    /*
     * PRICE COMES FROM EXPERT PRODUCT.
     */
    const products =
      await base44.asServiceRole.entities.ExpertProduct.list(
        "sortOrder",
        500
      );

    const product = (
      Array.isArray(products)
        ? products
        : []
    ).find(
      (item: any) =>
        item.active !== false &&
        String(item.categoryId) ===
          categoryId &&
        String(item.optionId) ===
          optionId
    );

    if (!product) {
      return json(
        {
          ok: false,
          error:
            "This service is currently unavailable. Please refresh and try again.",
        },
        404
      );
    }

    const unitPrice = safeNumber(
      product.unitPrice
    );

    if (unitPrice <= 0) {
      return json(
        {
          ok: false,
          error:
            "This service does not currently have a valid price.",
        },
        400
      );
    }

    const amount =
      unitPrice * quantity;

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return json(
        {
          ok: false,
          error:
            "Unable to calculate booking amount.",
        },
        400
      );
    }

    const origin =
      new URL(req.url).origin;

    const requestedCallback =
      clean(
        body.callbackUrl,
        2000
      );

    const callbackUrl =
      safeCallback(
        requestedCallback,
        origin
      )
        ? requestedCallback
        : `${origin}/app/lemak-expert-product`;

    const notificationUrl =
      `${origin}/functions/expertPaymentWebhook`;

    const reference =
      `LEX-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 10)
        .toUpperCase()}`;

    let booking;

    try {
      booking =
        await base44.asServiceRole.entities.ExpertBooking.create(
          {
            userId: user.id,
            customerName:
              user.full_name ||
              user.name ||
              "Customer",
            customerEmail:
              user.email || "",
            customerPhone:
              user.phone_number ||
              user.phone ||
              "",
            categoryId:
              product.categoryId,
            categoryName:
              product.categoryName,
            optionId:
              product.optionId,
            optionName:
              product.optionName,
            quantity,
            unitPrice,
            amount,
            bookingDate,
            location,
            notes,
            paymentReference:
              reference,
            paymentStatus:
              "pending",
            bookingStatus:
              "awaiting_payment",
          }
        );
    } catch (error) {
      console.error(
        "ExpertBooking create error:",
        error
      );

      return json(
        {
          ok: false,
          error:
            "Unable to create your booking.",
        },
        500
      );
    }

    const secretKey =
      await secrets.get(
        "KORA_SECRET_KEY"
      );

    if (!secretKey) {
      console.error(
        "KORA_SECRET_KEY is missing."
      );

      return json(
        {
          ok: false,
          error:
            "Payment service is not configured yet.",
        },
        500
      );
    }

    try {
      await base44.asServiceRole.entities.ExpertPayment.create(
        {
          bookingId: booking.id,
          userId: user.id,
          reference,
          amount,
          currency: "NGN",
          status: "pending",
          provider: "KoraPay",
        }
      );
    } catch (error) {
      console.error(
        "ExpertPayment create error:",
        error
      );
    }

    const payload = {
      reference,
      amount,
      currency: "NGN",
      redirect_url: callbackUrl,
      notification_url: notificationUrl,

      narration:
        `Lemak Expert - ${product.optionName}`,

      customer: {
        name:
          user.full_name ||
          user.name ||
          "Customer",
        email:
          user.email || "",
      },
    };

    let providerResponse;

    try {
      const response =
        await fetch(
          `${KORA_API}/charges/initialize`,
          {
            method: "POST",
            headers: {
              Authorization:
                `Bearer ${secretKey}`,
              "Content-Type":
                "application/json",
              Accept:
                "application/json",
            },
            body: JSON.stringify(
              payload
            ),
          }
        );

      const raw =
        await response.text();

      try {
        providerResponse =
          JSON.parse(raw);
      } catch {
        providerResponse = {
          raw,
        };
      }

      console.log(
        "KoraPay status:",
        response.status
      );

      console.log(
        "KoraPay response:",
        JSON.stringify(
          providerResponse
        )
      );

      if (
        !response.ok ||
        providerResponse?.status !== true
      ) {
        try {
          await base44.asServiceRole.entities.ExpertBooking.update(
            booking.id,
            {
              paymentStatus:
                "failed",
            }
          );
        } catch {}

        return json(
          {
            ok: false,
            error:
              providerResponse?.message ||
              "KoraPay could not initialize payment.",
            providerResponse,
          },
          502
        );
      }
    } catch (error) {
      console.error(
        "KoraPay network error:",
        error
      );

      try {
        await base44.asServiceRole.entities.ExpertBooking.update(
          booking.id,
          {
            paymentStatus:
              "failed",
          }
        );
      } catch {}

      return json(
        {
          ok: false,
          error:
            "Unable to connect to KoraPay.",
        },
        502
      );
    }

    const checkoutUrl =
      providerResponse?.data
        ?.checkout_url ||
      providerResponse?.data
        ?.checkoutUrl;

    if (!checkoutUrl) {
      return json(
        {
          ok: false,
          error:
            "KoraPay did not return a checkout URL.",
          providerResponse,
        },
        502
      );
    }

    return json({
      ok: true,
      bookingId:
        booking.id,
      reference,
      amount,
      currency: "NGN",
      checkoutUrl,
    });
  } catch (error) {
    console.error(
      "expertBookingCheckout fatal:",
      error
    );

    return json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to start payment.",
      },
      500
    );
  }
  }

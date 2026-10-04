import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { secrets } from "base44:runtime";

const KORA_API =
  "https://api.korapay.com/merchant/api/v1";

/* -------------------------------------------------------
   LEMAK EXPERT PRODUCTS
------------------------------------------------------- */

const PRODUCTS = [
  {
    id: "rentals",
    name: "Rentals",
    options: [
      {
        id: "chairs",
        name: "Plastic Chairs",
        unitPrice: 500,
      },
      {
        id: "tables",
        name: "Tables",
        unitPrice: 1500,
      },
      {
        id: "canopies",
        name: "Canopies",
        unitPrice: 15000,
      },
      {
        id: "event_equipment",
        name: "Event Equipment",
        unitPrice: 25000,
      },
    ],
  },

  {
    id: "event-planning",
    name: "Event Planning",
    options: [
      {
        id: "wedding",
        name: "Wedding Planning",
        unitPrice: 150000,
      },
      {
        id: "birthday",
        name: "Birthday Planning",
        unitPrice: 75000,
      },
      {
        id: "house-warming",
        name: "House Warming",
        unitPrice: 60000,
      },
      {
        id: "corporate",
        name: "Corporate Event",
        unitPrice: 150000,
      },
      {
        id: "full-planning",
        name: "Full Event Planning",
        unitPrice: 200000,
      },
      {
        id: "decoration",
        name: "Event Decoration",
        unitPrice: 100000,
      },
    ],
  },

  {
    id: "water-production",
    name: "Water Production",
    options: [
      {
        id: "sachet",
        name: "Sachet Water",
        unitPrice: 25000,
      },
      {
        id: "bottled",
        name: "Bottled Water",
        unitPrice: 50000,
      },
      {
        id: "custom-branded",
        name: "Custom Branded Water",
        unitPrice: 100000,
      },
      {
        id: "bulk",
        name: "Bulk Water Production",
        unitPrice: 75000,
      },
    ],
  },

  {
    id: "electricity",
    name: "Electricity",
    options: [
      {
        id: "installation",
        name: "Electrical Installation",
        unitPrice: 75000,
      },
      {
        id: "wiring",
        name: "Electrical Wiring",
        unitPrice: 100000,
      },
      {
        id: "maintenance",
        name: "Electrical Maintenance",
        unitPrice: 50000,
      },
      {
        id: "generator",
        name: "Generator / Electrical Engineering",
        unitPrice: 100000,
      },
    ],
  },

  {
    id: "website-app-development",
    name: "Website & App Development",
    options: [
      {
        id: "business-website",
        name: "Business Website",
        unitPrice: 150000,
      },
      {
        id: "ecommerce",
        name: "E-commerce Website",
        unitPrice: 250000,
      },
      {
        id: "mobile-app",
        name: "Mobile App",
        unitPrice: 400000,
      },
      {
        id: "web-app",
        name: "Web Application",
        unitPrice: 350000,
      },
      {
        id: "custom-software",
        name: "Custom Software",
        unitPrice: 500000,
      },
    ],
  },
];

/* -------------------------------------------------------
   HELPERS
------------------------------------------------------- */

function clean(
  value: unknown,
  max = 1000
): string {
  return String(value ?? "")
    .trim()
    .slice(0, max);
}

function json(
  data: unknown,
  status = 200
): Response {
  return Response.json(data, {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function findService(
  categoryId: string,
  optionId: string
) {
  const category = PRODUCTS.find(
    (item) => item.id === categoryId
  );

  if (!category) {
    return null;
  }

  const option = category.options.find(
    (item) => item.id === optionId
  );

  if (!option) {
    return null;
  }

  return {
    category,
    option,
  };
}

function isValidBookingDate(
  bookingDate: string
): boolean {
  if (!bookingDate) {
    return false;
  }

  const selectedDate = new Date(
    `${bookingDate}T00:00:00`
  );

  if (
    Number.isNaN(
      selectedDate.getTime()
    )
  ) {
    return false;
  }

  const today = new Date();

  today.setHours(
    0,
    0,
    0,
    0
  );

  return selectedDate >= today;
}

function isSafeCallbackUrl(
  callbackUrl: string,
  origin: string
): boolean {
  if (!callbackUrl) {
    return false;
  }

  try {
    const url = new URL(
      callbackUrl,
      origin
    );

    return url.origin === origin;
  } catch {
    return false;
  }
}

function makeReference(): string {
  const timestamp =
    Date.now();

  const randomPart =
    crypto
      .randomUUID()
      .replace(/-/g, "")
      .slice(0, 12)
      .toUpperCase();

  return `LMK-EXP-${timestamp}-${randomPart}`;
}

/* -------------------------------------------------------
   MAIN FUNCTION
------------------------------------------------------- */

export default async function (
  req: Request
): Promise<Response> {
  let service: any = null;

  let createdBookingId:
    | string
    | null = null;

  let createdPaymentId:
    | string
    | null = null;

  try {
    /* ---------------------------------------------------
       1. METHOD
    --------------------------------------------------- */

    if (req.method !== "POST") {
      return json(
        {
          ok: false,
          error:
            "Method not allowed.",
        },
        405
      );
    }

    /* ---------------------------------------------------
       2. BASE44 + AUTH
    --------------------------------------------------- */

    const base44 =
      createClientFromRequest(req);

    let user;

    try {
      user =
        await base44.auth.me();
    } catch (authError) {
      console.error(
        "Lemak Expert auth error:",
        authError
      );

      return json(
        {
          ok: false,
          error:
            "Authentication failed. Please sign in again.",
        },
        401
      );
    }

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

    /* ---------------------------------------------------
       3. SERVICE ROLE
    --------------------------------------------------- */

    service =
      base44.asServiceRole;

    /* ---------------------------------------------------
       4. BODY
    --------------------------------------------------- */

    let body: any;

    try {
      body = await req.json();
    } catch {
      return json(
        {
          ok: false,
          error:
            "Invalid request body.",
        },
        400
      );
    }

    /* ---------------------------------------------------
       5. INPUTS
    --------------------------------------------------- */

    const categoryId =
      clean(
        body?.categoryId,
        100
      );

    const optionId =
      clean(
        body?.optionId,
        100
      );

    const bookingDate =
      clean(
        body?.bookingDate,
        100
      );

    const location =
      clean(
        body?.location,
        1000
      );

    const notes =
      clean(
        body?.notes,
        2000
      );

    const callbackUrl =
      clean(
        body?.callbackUrl,
        1000
      );

    const quantity =
      Number(
        body?.quantity
      );

    /* ---------------------------------------------------
       6. SERVICE VALIDATION
    --------------------------------------------------- */

    if (
      !categoryId ||
      !optionId
    ) {
      return json(
        {
          ok: false,
          error:
            "Please select a service and exact service option.",
        },
        400
      );
    }

    const selected =
      findService(
        categoryId,
        optionId
      );

    if (!selected) {
      return json(
        {
          ok: false,
          error:
            "Invalid service selection.",
        },
        400
      );
    }

    /* ---------------------------------------------------
       7. QUANTITY
    --------------------------------------------------- */

    if (
      !Number.isInteger(
        quantity
      ) ||
      quantity < 1 ||
      quantity > 10000
    ) {
      return json(
        {
          ok: false,
          error:
            "Invalid quantity.",
        },
        400
      );
    }

    /* ---------------------------------------------------
       8. DATE
    --------------------------------------------------- */

    if (!bookingDate) {
      return json(
        {
          ok: false,
          error:
            "Please select a service date.",
        },
        400
      );
    }

    if (
      !isValidBookingDate(
        bookingDate
      )
    ) {
      return json(
        {
          ok: false,
          error:
            "Please select today or a future service date.",
        },
        400
      );
    }

    /* ---------------------------------------------------
       9. LOCATION
    --------------------------------------------------- */

    if (!location) {
      return json(
        {
          ok: false,
          error:
            "Please provide the service location.",
        },
        400
      );
    }

    /* ---------------------------------------------------
       10. PRICE
    --------------------------------------------------- */

    const unitPrice =
      Number(
        selected.option.unitPrice
      );

    if (
      !Number.isFinite(
        unitPrice
      ) ||
      unitPrice <= 0
    ) {
      return json(
        {
          ok: false,
          error:
            "Invalid service price.",
        },
        400
      );
    }

    const amount =
      unitPrice * quantity;

    if (
      !Number.isFinite(
        amount
      ) ||
      amount < 100
    ) {
      return json(
        {
          ok: false,
          error:
            "Invalid booking amount.",
        },
        400
      );
    }

    if (
      amount >
      50000000
    ) {
      return json(
        {
          ok: false,
          error:
            "Booking amount exceeds the allowed limit.",
        },
        400
      );
    }

    /* ---------------------------------------------------
       11. KORAPAY SECRET
    --------------------------------------------------- */

    const koraSecret =
      secrets.get(
        "KORA_SECRET_KEY"
      );

    if (!koraSecret) {
      console.error(
        "KORA_SECRET_KEY is missing."
      );

      return json(
        {
          ok: false,
          error:
            "Payment service is temporarily unavailable. KORA_SECRET_KEY is not configured.",
        },
        503
      );
    }

    /* ---------------------------------------------------
       12. CUSTOMER
    --------------------------------------------------- */

    const customerName =
      clean(
        user.full_name ||
          user.name ||
          "Lemak Connect Customer",
        200
      );

    const customerEmail =
      clean(
        user.email,
        320
      );

    if (!customerEmail) {
      return json(
        {
          ok: false,
          error:
            "Your account does not have a valid email address. Please update your profile before making payment.",
        },
        400
      );
    }

    /* ---------------------------------------------------
       13. REFERENCE
    --------------------------------------------------- */

    const reference =
      makeReference();

    /* ---------------------------------------------------
       14. CREATE BOOKING
    --------------------------------------------------- */

    let booking;

    try {
      booking =
        await service.entities.ExpertBooking.create(
          {
            userId:
              user.id,

            customerName,

            customerEmail,

            categoryId,

            categoryName:
              selected.category.name,

            optionId,

            optionName:
              selected.option.name,

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
    } catch (bookingError) {
      console.error(
        "ExpertBooking.create failed:",
        bookingError
      );

      return json(
        {
          ok: false,
          error:
            "Unable to create your booking record. Please check the ExpertBooking entity configuration.",
          details:
            bookingError instanceof Error
              ? bookingError.message
              : String(
                  bookingError
                ),
        },
        500
      );
    }

    createdBookingId =
      booking?.id || null;

    if (!createdBookingId) {
      return json(
        {
          ok: false,
          error:
            "Booking was created without a booking ID.",
        },
        500
      );
    }

    /* ---------------------------------------------------
       15. CREATE PAYMENT RECORD
    ---------------------------------------------------
    
       IMPORTANT:
       Store the amount in NGN here.
       Do NOT multiply by 100.
    */

    let payment;

    try {
      payment =
        await service.entities.ExpertPayment.create(
          {
            bookingId:
              createdBookingId,

            userId:
              user.id,

            reference,

            amount,

            currency:
              "NGN",

            status:
              "initialized",

            provider:
              "korapay",
          }
        );
    } catch (paymentError) {
      console.error(
        "ExpertPayment.create failed:",
        paymentError
      );

      try {
        await service.entities.ExpertBooking.update(
          createdBookingId,
          {
            paymentStatus:
              "failed",

            bookingStatus:
              "payment_failed",
          }
        );
      } catch (updateError) {
        console.error(
          "Unable to mark booking payment failed:",
          updateError
        );
      }

      return json(
        {
          ok: false,
          error:
            "Unable to create the payment record. Please check the ExpertPayment entity configuration.",
          details:
            paymentError instanceof Error
              ? paymentError.message
              : String(
                  paymentError
                ),
        },
        500
      );
    }

    createdPaymentId =
      payment?.id || null;

    /* ---------------------------------------------------
       16. ORIGIN
    --------------------------------------------------- */

    const origin =
      new URL(
        req.url
      ).origin;

    /* ---------------------------------------------------
       17. REDIRECT URL
    --------------------------------------------------- */

    let redirectUrl =
      `${origin}/app/lemak-expert-product`;

    if (
      callbackUrl &&
      isSafeCallbackUrl(
        callbackUrl,
        origin
      )
    ) {
      redirectUrl =
        callbackUrl;
    }

    /* ---------------------------------------------------
       18. WEBHOOK URL
    --------------------------------------------------- */

    const notificationUrl =
      `${origin}/functions/expertPaymentWebhook`;

    /* ---------------------------------------------------
       19. KORAPAY PAYLOAD
    ---------------------------------------------------
    
       KoraPay Initialize Charge requires:
       amount
       currency
       reference
       redirect_url
       notification_url
       narration
       customer.email
    */

    const koraPayload = {
      amount,

      currency:
        "NGN",

      reference,

      redirect_url:
        redirectUrl,

      notification_url:
        notificationUrl,

      narration:
        `Lemak Expert - ${selected.category.name} - ${selected.option.name}`,

      merchant_bears_cost:
        false,

      customer: {
        name:
          customerName,

        email:
          customerEmail,
      },
    };

    console.log(
      "Lemak Expert KoraPay request:",
      {
        reference,
        amount,
        currency:
          "NGN",
        categoryId,
        optionId,
        quantity,
        redirectUrl,
        notificationUrl,
      }
    );

    /* ---------------------------------------------------
       20. CALL KORAPAY
    --------------------------------------------------- */

    let response;

    try {
      response =
        await fetch(
          `${KORA_API}/charges/initialize`,
          {
            method:
              "POST",

            headers: {
              Authorization:
                `Bearer ${koraSecret}`,

              "Content-Type":
                "application/json",

              Accept:
                "application/json",
            },

            body:
              JSON.stringify(
                koraPayload
              ),
          }
        );
    } catch (networkError) {
      console.error(
        "KoraPay network error:",
        networkError
      );

      await markPaymentFailed(
        service,
        createdBookingId,
        createdPaymentId
      );

      return json(
        {
          ok: false,
          error:
            "Unable to connect to KoraPay. Please try again.",
          details:
            networkError instanceof Error
              ? networkError.message
              : String(
                  networkError
                ),
        },
        502
      );
    }

    /* ---------------------------------------------------
       21. READ KORAPAY RESPONSE
    --------------------------------------------------- */

    const rawResponse =
      await response.text();

    let koraData: any = null;

    try {
      koraData =
        rawResponse
          ? JSON.parse(
              rawResponse
            )
          : null;
    } catch {
      koraData = null;
    }

    console.log(
      "KoraPay response:",
      {
        httpStatus:
          response.status,

        status:
          koraData?.status,

        message:
          koraData?.message,

        error:
          koraData?.error,

        reference,
      }
    );

    /* ---------------------------------------------------
       22. CHECK KORAPAY SUCCESS
    --------------------------------------------------- */

    const checkoutUrl =
      koraData?.data
        ?.checkout_url;

    const koraSuccess =
      response.ok &&
      koraData?.status ===
        true &&
      typeof checkoutUrl ===
        "string" &&
      checkoutUrl.trim()
        .length > 0;

    if (!koraSuccess) {
      await markPaymentFailed(
        service,
        createdBookingId,
        createdPaymentId
      );

      const providerMessage =
        koraData?.message ||
        koraData?.error ||
        koraData?.data?.message ||
        `KoraPay returned HTTP ${response.status}.`;

      return json(
        {
          ok: false,

          error:
            `KoraPay could not initialize the payment: ${providerMessage}`,

          reference,

          providerStatus:
            response.status,

          providerResponse:
            koraData,
        },
        502
      );
    }

    /* ---------------------------------------------------
       23. SUCCESS
    --------------------------------------------------- */

    console.log(
      "Lemak Expert payment initialized successfully:",
      {
        reference,
        bookingId:
          createdBookingId,
        paymentId:
          createdPaymentId,
      }
    );

    return json({
      ok: true,

      bookingId:
        createdBookingId,

     

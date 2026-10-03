import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { secrets } from "base44:runtime";

const KORA_API = "https://api.korapay.com/merchant/api/v1";

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

function clean(value: unknown, max = 1000): string {
  return String(value ?? "")
    .trim()
    .slice(0, max);
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

  if (Number.isNaN(selectedDate.getTime())) {
    return false;
  }

  const today = new Date();

  today.setHours(0, 0, 0, 0);

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

    // Only allow your own Lemak Connect origin.
    return url.origin === origin;
  } catch {
    return false;
  }
}

function makeReference(): string {
  const timestamp = Date.now();

  const randomPart =
    crypto.randomUUID()
      .replace(/-/g, "")
      .slice(0, 12)
      .toUpperCase();

  return `LMK-EXP-${timestamp}-${randomPart}`;
}

export default async function (
  req: Request
): Promise<Response> {
  let service: any = null;
  let createdBookingId: string | null = null;
  let createdPaymentId: string | null = null;

  try {
    /*
     * ----------------------------------------------------
     * 1. METHOD CHECK
     * ----------------------------------------------------
     */

    if (req.method !== "POST") {
      return Response.json(
        {
          ok: false,
          error: "Method not allowed.",
        },
        {
          status: 405,
          headers: {
            Allow: "POST",
          },
        }
      );
    }

    /*
     * ----------------------------------------------------
     * 2. BASE44 CLIENT + AUTH
     * ----------------------------------------------------
     */

    const base44 =
      createClientFromRequest(req);

    const user =
      await base44.auth.me();

    if (!user) {
      return Response.json(
        {
          ok: false,
          error:
            "Please sign in before booking a service.",
        },
        {
          status: 401,
        }
      );
    }

    /*
     * ----------------------------------------------------
     * 3. SERVICE ROLE
     * ----------------------------------------------------
     */

    service =
      base44.asServiceRole;

    /*
     * ----------------------------------------------------
     * 4. READ REQUEST BODY
     * ----------------------------------------------------
     */

    let body: any;

    try {
      body = await req.json();
    } catch {
      return Response.json(
        {
          ok: false,
          error:
            "Invalid request body.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ----------------------------------------------------
     * 5. CLEAN INPUTS
     * ----------------------------------------------------
     */

    const categoryId =
      clean(body?.categoryId, 100);

    const optionId =
      clean(body?.optionId, 100);

    const bookingDate =
      clean(body?.bookingDate, 100);

    const location =
      clean(body?.location, 1000);

    const notes =
      clean(body?.notes, 2000);

    const callbackUrl =
      clean(body?.callbackUrl, 1000);

    const quantity =
      Number(body?.quantity);

    /*
     * ----------------------------------------------------
     * 6. VALIDATE SERVICE
     * ----------------------------------------------------
     */

    if (!categoryId || !optionId) {
      return Response.json(
        {
          ok: false,
          error:
            "Please select a service and exact service option.",
        },
        {
          status: 400,
        }
      );
    }

    const selected =
      findService(
        categoryId,
        optionId
      );

    if (!selected) {
      return Response.json(
        {
          ok: false,
          error:
            "Invalid service selection.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ----------------------------------------------------
     * 7. VALIDATE QUANTITY
     * ----------------------------------------------------
     */

    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 10000
    ) {
      return Response.json(
        {
          ok: false,
          error: "Invalid quantity.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ----------------------------------------------------
     * 8. VALIDATE DATE
     * ----------------------------------------------------
     */

    if (!bookingDate) {
      return Response.json(
        {
          ok: false,
          error:
            "Please select a service date.",
        },
        {
          status: 400,
        }
      );
    }

    if (!isValidBookingDate(bookingDate)) {
      return Response.json(
        {
          ok: false,
          error:
            "Please select today or a future service date.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ----------------------------------------------------
     * 9. VALIDATE LOCATION
     * ----------------------------------------------------
     */

    if (!location) {
      return Response.json(
        {
          ok: false,
          error:
            "Please provide the service location.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ----------------------------------------------------
     * 10. CALCULATE PRICE SERVER-SIDE
     * ----------------------------------------------------
     */

    const unitPrice =
      Number(
        selected.option.unitPrice
      );

    if (
      !Number.isFinite(unitPrice) ||
      unitPrice <= 0
    ) {
      return Response.json(
        {
          ok: false,
          error:
            "Invalid service price.",
        },
        {
          status: 400,
        }
      );
    }

    const amount =
      unitPrice * quantity;

    if (
      !Number.isFinite(amount) ||
      amount < 100
    ) {
      return Response.json(
        {
          ok: false,
          error:
            "Invalid booking amount.",
        },
        {
          status: 400,
        }
      );
    }

    if (amount > 50000000) {
      return Response.json(
        {
          ok: false,
          error:
            "Booking amount exceeds the allowed limit.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ----------------------------------------------------
     * 11. KORAPAY SECRET
     * ----------------------------------------------------
     */

    const koraSecret =
      secrets.get(
        "KORA_SECRET_KEY"
      );

    if (!koraSecret) {
      console.error(
        "expertBookingCheckout: KORA_SECRET_KEY is missing."
      );

      return Response.json(
        {
          ok: false,
          error:
            "Payment service is temporarily unavailable.",
        },
        {
          status: 503,
        }
      );
    }

    /*
     * ----------------------------------------------------
     * 12. GENERATE PAYMENT REFERENCE
     * ----------------------------------------------------
     */

    const reference =
      makeReference();

    /*
     * ----------------------------------------------------
     * 13. CREATE BOOKING
     * ----------------------------------------------------
     */

    const booking =
      await service.entities.ExpertBooking.create(
        {
          userId: user.id,

          customerName:
            clean(
              user.full_name,
              200
            ),

          customerEmail:
            clean(
              user.email,
              320
            ),

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

    createdBookingId =
      booking?.id || null;

    if (!createdBookingId) {
      throw new Error(
        "Booking was created without an ID."
      );
    }

    /*
     * ----------------------------------------------------
     * 14. CREATE PAYMENT RECORD
     * ----------------------------------------------------
     *
     * amount = NGN amount
     * amountKobo = smallest NGN unit
     */

    const payment =
      await service.entities.ExpertPayment.create(
        {
          bookingId:
            createdBookingId,

          userId:
            user.id,

          reference,

          amount:
            Math.round(amount * 100),

          currency:
            "NGN",

          status:
            "initialized",

          provider:
            "korapay",
        }
      );

    createdPaymentId =
      payment?.id || null;

    /*
     * ----------------------------------------------------
     * 15. CALLBACK URL
     * ----------------------------------------------------
     */

    const origin =
      new URL(req.url).origin;

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

    /*
     * ----------------------------------------------------
     * 16. WEBHOOK URL
     * ----------------------------------------------------
     */

    const notificationUrl =
      `${origin}/functions/expertPaymentWebhook`;

    /*
     * ----------------------------------------------------
     * 17. KORAPAY REQUEST
     * ----------------------------------------------------
     *
     * IMPORTANT:
     * KoraPay receives amount in NGN,
     * not Kobo.
     */

    const koraPayload = {
      reference,

      amount,

      currency:
        "NGN",

      redirect_url:
        redirectUrl,

      notification_url:
        notificationUrl,

      customer: {
        name:
          clean(
            user.full_name,
            200
          ),

        email:
          clean(
            user.email,
            320
          ),
      },
    };

    console.log(
      "Initializing Lemak Expert payment:",
      {
        reference,
        amount,
        categoryId,
        optionId,
        quantity,
      }
    );

    /*
     * ----------------------------------------------------
     * 18. CALL KORAPAY
     * ----------------------------------------------------
     */

    const response =
      await fetch(
        `${KORA_API}/charges/initialize`,
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${koraSecret}`,

            "Content-Type":
              "application/json",

            Accept:
              "application/json",
          },

          body:
            JSON

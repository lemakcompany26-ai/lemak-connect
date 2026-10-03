import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { secrets } from "base44:runtime";

const KORA_API =
  "https://api.korapay.com/merchant/api/v1";

const PRODUCTS = [
  {
    id: "rentals",
    name: "Rentals",
    options: [
      { id: "chairs", name: "Plastic Chairs", unitPrice: 500 },
      { id: "tables", name: "Tables", unitPrice: 1500 },
      { id: "canopies", name: "Canopies", unitPrice: 15000 },
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
      { id: "wedding", name: "Wedding Planning", unitPrice: 150000 },
      { id: "birthday", name: "Birthday Planning", unitPrice: 75000 },
      {
        id: "house-warming",
        name: "House Warming",
        unitPrice: 60000,
      },
      { id: "corporate", name: "Corporate Event", unitPrice: 150000 },
      {
        id: "full-planning",
        name: "Full Event Planning",
        unitPrice: 200000,
      },
      { id: "decoration", name: "Event Decoration", unitPrice: 100000 },
    ],
  },

  {
    id: "water-production",
    name: "Water Production",
    options: [
      { id: "sachet", name: "Sachet Water", unitPrice: 25000 },
      { id: "bottled", name: "Bottled Water", unitPrice: 50000 },
      {
        id: "custom-branded",
        name: "Custom Branded Water",
        unitPrice: 100000,
      },
      { id: "bulk", name: "Bulk Water Production", unitPrice: 75000 },
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

function clean(value: unknown, max = 1000) {
  return String(value ?? "")
    .trim()
    .slice(0, max);
}

function findService(categoryId: string, optionId: string) {
  const category = PRODUCTS.find(
    (item) => item.id === categoryId
  );

  if (!category) return null;

  const option = category.options.find(
    (item) => item.id === optionId
  );

  if (!option) return null;

  return {
    category,
    option,
  };
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json(
        { error: "Please sign in before booking a service." },
        { status: 401 }
      );
    }

    if (req.method !== "POST") {
      return Response.json(
        { error: "Method not allowed" },
        { status: 405 }
      );
    }

    const body = await req.json();

    const categoryId = clean(body.categoryId, 100);
    const optionId = clean(body.optionId, 100);
    const bookingDate = clean(body.bookingDate, 100);
    const location = clean(body.location, 1000);
    const notes = clean(body.notes, 2000);

    const quantity = Number(body.quantity);

    if (!categoryId || !optionId) {
      return Response.json(
        { error: "Please select a service and exact service option." },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 10000
    ) {
      return Response.json(
        { error: "Invalid quantity." },
        { status: 400 }
      );
    }

    if (!bookingDate) {
      return Response.json(
        { error: "Please select a service date." },
        { status: 400 }
      );
    }

    if (!location) {
      return Response.json(
        { error: "Please provide the service location." },
        { status: 400 }
      );
    }

    const selected = findService(
      categoryId,
      optionId
    );

    if (!selected) {
      return Response.json(
        { error: "Invalid service selection." },
        { status: 400 }
      );
    }

    const unitPrice = Number(
      selected.option.unitPrice
    );

    const amount = unitPrice * quantity;

    if (!Number.isFinite(amount) || amount < 100) {
      return Response.json(
        { error: "Invalid booking amount." },
        { status: 400 }
      );
    }

    if (amount > 50000000) {
      return Response.json(
        { error: "Booking amount exceeds the allowed limit." },
        { status: 400 }
      );
    }

    const koraSecret =
      secrets.get("KORA_SECRET_KEY");

    if (!koraSecret) {
      console.error("KORA_SECRET_KEY is missing.");

      return Response.json(
        {
          error:
            "Payment service is temporarily unavailable.",
        },
        { status: 503 }
      );
    }

    const service =
      base44.asServiceRole;

    const reference =
      `LMK-EXP-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 9)
        .toUpperCase()}`;

    const booking =
      await service.entities.ExpertBooking.create({
        userId: user.id,

        customerName:
          user.full_name || "",

        customerEmail:
          user.email || "",

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
      });

    const payment =
      await service.entities.ExpertPayment.create({
        bookingId: booking.id,
        userId: user.id,

        reference,

        amount:
          Math.round(amount * 100),

        currency: "NGN",

        status:
          "initialized",

        provider:
          "korapay",
      });

    const origin =
      new URL(req.url).origin;

    const requestedCallback =
      clean(body.callbackUrl, 1000);

    const redirectUrl =
      /^https?:\/\//i.test(
        requestedCallback
      )
        ? requestedCallback
        : `${origin}/app/lemak-expert-product`;

    const notificationUrl =
      `${origin}/functions/expertPaymentWebhook`;

    const koraPayload = {
      reference,
      amount,
      currency: "NGN",

      redirect_url:
        redirectUrl,

      notification_url:
        notificationUrl,

      customer: {
        name:
          user.full_name || "",
        email:
          user.email,
      },
    };

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
          },

          body:
            JSON.stringify(
              koraPayload
            ),
        }
      );

    const data =
      await response
        .json()
        .catch(() => null);

    if (
      !response.ok ||
      !data ||
      data.status !== true ||
      !data.data?.checkout_url
    ) {
      await service.entities.ExpertBooking.update(
        booking.id,
        {
          paymentStatus:
            "failed",

          bookingStatus:
            "payment_failed",
        }
      );

      await service.entities.ExpertPayment.update(
        payment.id,
        {
          status:
            "failed",
        }
      );

      return Response.json(
        {
          error:
            "Could not start payment. Please try again.",
        },
        { status: 502 }
      );
    }

    return Response.json({
      ok: true,

      bookingId:
        booking.id,

      paymentId:
        payment.id,

      reference,

      amount,

      currency:
        "NGN",

      checkoutUrl:
        data.data.checkout_url,
    });

  } catch (error) {
    console.error(
      "expertBookingCheckout:",
      error
    );

    return Response.json(
      {
        error:
          "Unable to create your booking. Please try again.",
      },
      { status: 500 }
    );
  }
       }

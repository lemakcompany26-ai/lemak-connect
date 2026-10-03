import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";

const ADMIN_EMAILS = [
  "lemakcompany26@gmail.com",
  "dammyqueen107@gmail.com",
];

const ALLOWED_STATUSES = [
  "awaiting_payment",
  "confirmed",
  "processing",
  "completed",
  "cancelled",
];

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

function clean(
  value: unknown,
  max = 500
): string {
  return String(value ?? "")
    .trim()
    .slice(0, max);
}

async function getAdmin(req: Request) {
  const base44 =
    createClientFromRequest(req);

  const user =
    await base44.auth.me();

  if (!user) {
    throw new Response(
      JSON.stringify({
        ok: false,
        error: "Unauthorized",
      }),
      {
        status: 401,
        headers: {
          "Content-Type":
            "application/json",
        },
      }
    );
  }

  const email =
    clean(user.email, 320).toLowerCase();

  const isAdmin =
    ADMIN_EMAILS.some(
      (adminEmail) =>
        adminEmail.toLowerCase() ===
        email
    );

  if (!isAdmin) {
    throw new Response(
      JSON.stringify({
        ok: false,
        error: "Forbidden",
      }),
      {
        status: 403,
        headers: {
          "Content-Type":
            "application/json",
        },
      }
    );
  }

  return {
    base44,
    user,
  };
}

async function readBody(
  req: Request
) {
  if (req.method !== "POST") {
    return {};
  }

  try {
    const text =
      await req.text();

    if (!text.trim()) {
      return {};
    }

    return JSON.parse(text);
  } catch (error) {
    console.error(
      "expertAdmin body parse error:",
      error
    );

    return {};
  }
}

export default async function (
  req: Request
): Promise<Response> {
  try {
    /*
     * ------------------------------------------
     * METHOD
     * ------------------------------------------
     */

    if (
      req.method !== "GET" &&
      req.method !== "POST"
    ) {
      return json(
        {
          ok: false,
          error:
            "Method not allowed.",
        },
        405
      );
    }

    /*
     * ------------------------------------------
     * ADMIN AUTHENTICATION
     * ------------------------------------------
     */

    const {
      base44,
      user,
    } =
      await getAdmin(req);

    /*
     * ------------------------------------------
     * SERVICE ROLE
     * ------------------------------------------
     */

    const service =
      base44.asServiceRole;

    /*
     * ------------------------------------------
     * REQUEST DATA
     * ------------------------------------------
     */

    const body =
      await readBody(req);

    const url =
      new URL(req.url);

    const action =
      clean(
        body?.action ||
          url.searchParams.get(
            "action"
          ) ||
          "list",
        100
      );

    /*
     * ------------------------------------------
     * LIST BOOKINGS
     * ------------------------------------------
     */

    if (action === "list") {
      try {
        const bookings =
          await service.entities.ExpertBooking.list(
            "-created_date",
            100
          );

        return json({
          ok: true,
          bookings:
            Array.isArray(bookings)
              ? bookings
              : [],
        });
      } catch (error) {
        console.error(
          "expertAdmin list error:",
          error
        );

        return json(
          {
            ok: false,
            error:
              "Unable to load expert bookings.",
            bookings: [],
          },
          500
        );
      }
    }

    /*
     * ------------------------------------------
     * GET ONE BOOKING
     * ------------------------------------------
     */

    if (action === "get") {
      const id =
        clean(
          body?.id ||
            url.searchParams.get(
              "id"
            ),
          200
        );

      if (!id) {
        return json(
          {
            ok: false,
            error:
              "Booking ID is required.",
          },
          400
        );
      }

      try {
        const booking =
          await service.entities.ExpertBooking.get(
            id
          );

        if (!booking) {
          return json(
            {
              ok: false,
              error:
                "Booking not found.",
            },
            404
          );
        }

        return json({
          ok: true,
          booking,
        });
      } catch (error) {
        console.error(
          "expertAdmin get error:",
          error
        );

        return json(
          {
            ok: false,
            error:
              "Unable to load this booking.",
          },
          500
        );
      }
    }

    /*
     * ------------------------------------------
     * UPDATE BOOKING STATUS
     * ------------------------------------------
     */

    if (
      action ===
      "update_status"
    ) {
      const id =
        clean(
          body?.id,
          200
        );

      const bookingStatus =
        clean(
          body?.bookingStatus,
          100
        );

      if (!id) {
        return json(
          {
            ok: false,
            error:
              "Booking ID is required.",
          },
          400
        );
      }

      if (
        !ALLOWED_STATUSES.includes(
          bookingStatus
        )
      ) {
        return json(
          {
            ok: false,
            error:
              "Invalid booking status.",
          },
          400
        );
      }

      let booking;

      try {
        booking =
          await service.entities.ExpertBooking.get(
            id
          );
      } catch (error) {
        console.error(
          "expertAdmin status lookup error:",
          error
        );

        return json(
          {
            ok: false,
            error:
              "Unable to find the booking.",
          },
          500
        );
      }

      if (!booking) {
        return json(
          {
            ok: false,
            error:
              "Booking not found.",
          },
          404
        );
      }

      try {
        const updated =
          await service.entities.ExpertBooking.update(
            id,
            {
              bookingStatus,
            }
          );

        return json({
          ok: true,
          booking:
            updated || {
              ...booking,
              bookingStatus,
            },
        });
      } catch (error) {
        console.error(
          "expertAdmin status update error:",
          error
        );

        return json(
          {
            ok: false,
            error:
              "Unable to update booking status.",
          },
          500
        );
      }
    }

    /*
     * ------------------------------------------
     * CANCEL BOOKING
     * ------------------------------------------
     */

    if (action === "cancel") {
      const id =
        clean(
          body?.id,
          200
        );

      if (!id) {
        return json(
          {
            ok: false,
            error:
              "Booking ID is required.",
          },
          400
        );
      }

      let booking;

      try {
        booking =
          await service.entities.ExpertBooking.get(
            id
          );
      } catch (error) {
        console.error(
          "expertAdmin cancel lookup error:",
          error
        );

        return json(
          {
            ok: false,
            error:
              "Unable to find the booking.",
          },
          500
        );
      }

      if (!booking) {
        return json(
          {
            ok: false,
            error:
              "Booking not found.",
          },
          404
        );
      }

      /*
       * Do not allow cancellation of an already
       * completed booking.
       */

      if (
        booking.bookingStatus ===
        "completed"
      ) {
        return json(
          {
            ok: false,
            error:
              "A completed booking cannot be cancelled.",
          },
          400
        );
      }

      /*
       * Do not use this endpoint to cancel
       * an already-paid booking.
       *
       * Paid bookings should normally go through
       * your payment/refund workflow.
       */

      if (
        booking.paymentStatus ===
        "paid"
      ) {
        return json(
          {
            ok: false,
            error:
              "A paid booking cannot be cancelled using this endpoint.",
          },
          400
        );
      }

      try {
        const updated =
          await service.entities.ExpertBooking.update(
            id,
            {
              bookingStatus:
                "cancelled",
            }
          );

        return json({
          ok: true,
          booking:
            updated || {
              ...booking,
              bookingStatus:
                "cancelled",
            },
        });
      } catch (error) {
        console.error(
          "expertAdmin cancel update error:",
          error
        );

        return json(
          {
            ok: false,
            error:
              "Unable to cancel this booking.",
          },
          500
        );
      }
    }

    /*
     * ------------------------------------------
     * UNKNOWN ACTION
     * ------------------------------------------
     */

    return json(
      {
        ok: false,
        error:
          `Unknown action: ${action}`,
      },
      400
    );
  } catch (error) {
    /*
     * Preserve our intentional 401/403 responses.
     */

    if (
      error instanceof Response
    ) {
      return error;
    }

    console.error(
      "expertAdmin fatal error:",
      error
    );

    return json(
      {
        ok: false,
        error:
          "Admin request failed.",
      },
      500
    );
  }
}

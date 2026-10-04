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

function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function clean(value: unknown, max = 1000) {
  return String(value ?? "")
    .trim()
    .slice(0, max);
}

async function getAdmin(req: Request) {
  const base44 = createClientFromRequest(req);

  let user;

  try {
    user = await base44.auth.me();
  } catch (error) {
    console.error("expertAdmin auth error:", error);

    throw new Response(
      JSON.stringify({
        ok: false,
        error: "Authentication failed. Please sign in again.",
      }),
      {
        status: 401,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  if (!user) {
    throw new Response(
      JSON.stringify({
        ok: false,
        error: "Unauthorized. Please sign in.",
      }),
      {
        status: 401,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  const email = clean(user.email, 200).toLowerCase();

  const isAdmin = ADMIN_EMAILS.some(
    (adminEmail) =>
      adminEmail.toLowerCase() === email
  );

  if (!isAdmin) {
    throw new Response(
      JSON.stringify({
        ok: false,
        error: "You do not have permission to access Lemak Expert management.",
      }),
      {
        status: 403,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  return {
    base44,
    user,
  };
}

export default async function (
  req: Request
): Promise<Response> {
  try {
    if (
      req.method !== "GET" &&
      req.method !== "POST"
    ) {
      return json(
        {
          ok: false,
          error: "Method not allowed.",
        },
        405
      );
    }

    const { base44 } = await getAdmin(req);

    const service = base44.asServiceRole;

    let body: Record<string, any> = {};

    if (req.method === "POST") {
      try {
        body = await req.json();
      } catch {
        body = {};
      }
    }

    const url = new URL(req.url);

    const action = clean(
      body.action ||
        url.searchParams.get("action") ||
        "list",
      100
    );

    /*
     * LIST
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
          bookings: Array.isArray(bookings)
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
              "Unable to read ExpertBooking records. Check that the ExpertBooking entity exists.",
            bookings: [],
          },
          500
        );
      }
    }

    /*
     * GET ONE
     */
    if (action === "get") {
      const id = clean(
        body.id ||
          url.searchParams.get("id"),
        200
      );

      if (!id) {
        return json(
          {
            ok: false,
            error: "Booking ID is required.",
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
              error: "Booking not found.",
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
              "Unable to retrieve this booking.",
          },
          500
        );
      }
    }

    /*
     * UPDATE STATUS
     */
    if (action === "update_status") {
      const id = clean(body.id, 200);
      const bookingStatus = clean(
        body.bookingStatus,
        100
      );

      if (!id) {
        return json(
          {
            ok: false,
            error: "Booking ID is required.",
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
            error: "Invalid booking status.",
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
            error: "Booking not found.",
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
          "expertAdmin update error:",
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
     * CANCEL
     */
    if (action === "cancel") {
      const id = clean(body.id, 200);

      if (!id) {
        return json(
          {
            ok: false,
            error: "Booking ID is required.",
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
            error: "Booking not found.",
          },
          404
        );
      }

      const paymentStatus = clean(
        booking.paymentStatus,
        100
      ).toLowerCase();

      if (paymentStatus === "paid") {
        return json(
          {
            ok: false,
            error:
              "A paid booking cannot be cancelled with this action.",
          },
          400
        );
      }

      try {
        const updated =
          await service.entities.ExpertBooking.update(
            id,
            {
              bookingStatus: "cancelled",
            }
          );

        return json({
          ok: true,
          booking:
            updated || {
              ...booking,
              bookingStatus: "cancelled",
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

    return json(
      {
        ok: false,
        error: `Unknown action: ${action}`,
      },
      400
    );
  } catch (error) {
    if (error instanceof Response) {
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
          error instanceof Error
            ? error.message
            : "Admin request failed.",
      },
      500
    );
  }
    }

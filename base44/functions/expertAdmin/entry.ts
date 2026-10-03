import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";

const ADMIN_EMAILS = [
  "lemakcompany26@gmail.com",
  "dammyqueen107@gmail.com",
];

async function getAdmin(req: Request) {
  const base44 =
    createClientFromRequest(
      req
    );

  const user =
    await base44.auth.me();

  if (!user) {
    throw new Response(
      JSON.stringify({
        error:
          "Unauthorized",
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
    String(
      user.email || ""
    ).toLowerCase();

  if (
    !ADMIN_EMAILS
      .map((item) =>
        item.toLowerCase()
      )
      .includes(email)
  ) {
    throw new Response(
      JSON.stringify({
        error:
          "Forbidden",
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

export default async function (
  req: Request
): Promise<Response> {
  try {
    const { base44 } =
      await getAdmin(req);

    const service =
      base44.asServiceRole;

    if (
      req.method !==
        "GET" &&
      req.method !==
        "POST"
    ) {
      return Response.json(
        {
          error:
            "Method not allowed",
        },
        { status: 405 }
      );
    }

    let body: any = {};

    if (req.method === "POST") {
      body =
        await req.json()
          .catch(() => ({}));
    }

    const url =
      new URL(req.url);

    const action =
      String(
        body.action ||
          url.searchParams.get(
            "action"
          ) ||
          "list"
      );

    /*
     * LIST BOOKINGS
     */
    if (
      action === "list"
    ) {
      const bookings =
        await service.entities.ExpertBooking.list(
          "-created_date",
          100
        );

      return Response.json({
        ok: true,
        bookings:
          bookings || [],
      });
    }

    /*
     * GET ONE BOOKING
     */
    if (
      action === "get"
    ) {
      const id =
        String(
          body.id ||
            url.searchParams.get(
              "id"
            ) ||
            ""
        );

      if (!id) {
        return Response.json(
          {
            error:
              "Booking ID is required.",
          },
          { status: 400 }
        );
      }

      const booking =
        await service.entities.ExpertBooking.get(
          id
        );

      if (!booking) {
        return Response.json(
          {
            error:
              "Booking not found.",
          },
          { status: 404 }
        );
      }

      return Response.json({
        ok: true,
        booking,
      });
    }

    /*
     * UPDATE BOOKING STATUS
     */
    if (
      action ===
      "update_status"
    ) {
      const id =
        String(
          body.id || ""
        );

      const bookingStatus =
        String(
          body.bookingStatus ||
            ""
        );

      const allowedStatuses = [
        "awaiting_payment",
        "confirmed",
        "processing",
        "completed",
        "cancelled",
      ];

      if (
        !id ||
        !allowedStatuses.includes(
          bookingStatus
        )
      ) {
        return Response.json(
          {
            error:
              "Invalid booking status.",
          },
          { status: 400 }
        );
      }

      const booking =
        await service.entities.ExpertBooking.get(
          id
        );

      if (!booking) {
        return Response.json(
          {
            error:
              "Booking not found.",
          },
          { status: 404 }
        );
      }

      const updated =
        await service.entities.ExpertBooking.update(
          id,
          {
            bookingStatus,
          }
        );

      return Response.json({
        ok: true,
        booking:
          updated,
      });
    }

    /*
     * CANCEL UNPAID BOOKING
     */
    if (
      action ===
      "cancel"
    ) {
      const id =
        String(
          body.id || ""
        );

      if (!id) {
        return Response.json(
          {
            error:
              "Booking ID is required.",
          },
          { status: 400 }
        );
      }

      const booking =
        await service.entities.ExpertBooking.get(
          id
        );

      if (!booking) {
        return Response.json(
          {
            error:
              "Booking not found.",
          },
          { status: 404 }
        );
      }

      if (
        booking.paymentStatus ===
        "paid"
      ) {
        return Response.json(
          {
            error:
              "A paid booking cannot be cancelled using this endpoint.",
          },
          { status: 400 }
        );
      }

      await service.entities.ExpertBooking.update(
        id,
        {
          bookingStatus:
            "cancelled",
        }
      );

      return Response.json({
        ok: true,
      });
    }

    return Response.json(
      {
        error:
          "Unknown action.",
      },
      { status: 400 }
    );

  } catch (error) {
    if (
      error instanceof Response
    ) {
      return error;
    }

    console.error(
      "expertAdmin:",
      error
    );

    return Response.json(
      {
        error:
          "Admin request failed.",
      },
      { status: 500 }
    );
  }
          }

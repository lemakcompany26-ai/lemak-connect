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
    (admin) => admin.toLowerCase() === email
  );

  if (!isAdmin) {
    throw new Response(
      JSON.stringify({
        ok: false,
        error: "You do not have permission to manage Lemak Expert.",
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

async function readBody(req: Request) {
  if (req.method !== "POST") {
    return {};
  }

  try {
    const data = await req.json();

    if (!data || typeof data !== "object") {
      return {};
    }

    return data;
  } catch {
    return {};
  }
}

export default async function (
  req: Request
): Promise<Response> {
  try {
    if (req.method !== "GET" && req.method !== "POST") {
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

    const body = await readBody(req);
    const url = new URL(req.url);

    const action = clean(
      body.action ||
        url.searchParams.get("action") ||
        "list",
      100
    );

    /*
     * ============================
     * BOOKINGS
     * ============================
     */

    if (action === "list") {
      try {
        const bookings =
          await service.entities.ExpertBooking.list(
            "-created_date",
            500
          );

        return json({
          ok: true,
          bookings: Array.isArray(bookings)
            ? bookings
            : [],
        });
      } catch (error) {
        console.error(
          "expertAdmin booking list:",
          error
        );

        return json(
          {
            ok: false,
            error:
              "Unable to read ExpertBooking. Make sure the ExpertBooking entity exists.",
            bookings: [],
          },
          500
        );
      }
    }

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
          await service.entities.ExpertBooking.get(id);

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
          "expertAdmin booking get:",
          error
        );

        return json(
          {
            ok: false,
            error: "Unable to retrieve booking.",
          },
          500
        );
      }
    }

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

      if (!ALLOWED_STATUSES.includes(bookingStatus)) {
        return json(
          {
            ok: false,
            error: "Invalid booking status.",
          },
          400
        );
      }

      try {
        const booking =
          await service.entities.ExpertBooking.get(id);

        if (!booking) {
          return json(
            {
              ok: false,
              error: "Booking not found.",
            },
            404
          );
        }

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
          "expertAdmin update status:",
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

      try {
        const booking =
          await service.entities.ExpertBooking.get(id);

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
                "A paid booking cannot be cancelled from this action.",
            },
            400
          );
        }

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
          "expertAdmin cancel:",
          error
        );

        return json(
          {
            ok: false,
            error: "Unable to cancel booking.",
          },
          500
        );
      }
    }

    /*
     * ============================
     * PRODUCTS
     * ============================
     */

    if (action === "products") {
      try {
        const products =
          await service.entities.ExpertProduct.list(
            "sortOrder",
            500
          );

        return json({
          ok: true,
          products: Array.isArray(products)
            ? products
            : [],
        });
      } catch (error) {
        console.error(
          "expertAdmin products:",
          error
        );

        return json(
          {
            ok: false,
            error:
              "Unable to read ExpertProduct. Create the ExpertProduct entity first.",
            products: [],
          },
          500
        );
      }
    }

    if (action === "create_product") {
      const categoryId = clean(
        body.categoryId,
        100
      );

      const categoryName = clean(
        body.categoryName,
        200
      );

      const categoryDescription = clean(
        body.categoryDescription,
        1000
      );

      const optionId = clean(
        body.optionId,
        100
      );

      const optionName = clean(
        body.optionName,
        200
      );

      const description = clean(
        body.description,
        1000
      );

      const unitPrice = Number(
        body.unitPrice
      );

      const imageUrl = clean(
        body.imageUrl,
        2000
      );

      const sortOrder = Number(
        body.sortOrder || 0
      );

      if (
        !categoryId ||
        !categoryName ||
        !optionId ||
        !optionName
      ) {
        return json(
          {
            ok: false,
            error:
              "Category and service name are required.",
          },
          400
        );
      }

      if (
        !Number.isFinite(unitPrice) ||
        unitPrice < 0
      ) {
        return json(
          {
            ok: false,
            error: "Enter a valid price.",
          },
          400
        );
      }

      try {
        const product =
          await service.entities.ExpertProduct.create(
            {
              categoryId,
              categoryName,
              categoryDescription,
              optionId,
              optionName,
              description,
              unitPrice,
              imageUrl,
              active: true,
              sortOrder,
            }
          );

        return json({
          ok: true,
          product,
        });
      } catch (error) {
        console.error(
          "expertAdmin create product:",
          error
        );

        return json(
          {
            ok: false,
            error:
              "Unable to create product. Check the ExpertProduct entity fields.",
          },
          500
        );
      }
    }

    if (action === "update_product") {
      const id = clean(body.id, 200);

      if (!id) {
        return json(
          {
            ok: false,
            error: "Product ID is required.",
          },
          400
        );
      }

      const updates: Record<string, any> = {};

      if (body.categoryId !== undefined)
        updates.categoryId = clean(
          body.categoryId,
          100
        );

      if (body.categoryName !== undefined)
        updates.categoryName = clean(
          body.categoryName,
          200
        );

      if (
        body.categoryDescription !==
        undefined
      )
        updates.categoryDescription = clean(
          body.categoryDescription,
          1000
        );

      if (body.optionId !== undefined)
        updates.optionId = clean(
          body.optionId,
          100
        );

      if (body.optionName !== undefined)
        updates.optionName = clean(
          body.optionName,
          200
        );

      if (body.description !== undefined)
        updates.description = clean(
          body.description,
          1000
        );

      if (body.imageUrl !== undefined)
        updates.imageUrl = clean(
          body.imageUrl,
          2000
        );

      if (body.unitPrice !== undefined) {
        const price = Number(
          body.unitPrice
        );

        if (
          !Number.isFinite(price) ||
          price < 0
        ) {
          return json(
            {
              ok: false,
              error: "Invalid price.",
            },
            400
          );
        }

        updates.unitPrice = price;
      }

      if (body.sortOrder !== undefined) {
        updates.sortOrder = Number(
          body.sortOrder || 0
        );
      }

      if (body.active !== undefined) {
        updates.active =
          body.active === true ||
          body.active === "true";
      }

      try {
        const product =
          await service.entities.ExpertProduct.update(
            id,
            updates
          );

        return json({
          ok: true,
          product,
        });
      } catch (error) {
        console.error(
          "expertAdmin update product:",
          error
        );

        return json(
          {
            ok: false,
            error:
              "Unable to update product.",
          },
          500
        );
      }
    }

    if (action === "toggle_product") {
      const id = clean(body.id, 200);

      if (!id) {
        return json(
          {
            ok: false,
            error: "Product ID is required.",
          },
          400
        );
      }

      try {
        const product =
          await service.entities.ExpertProduct.get(id);

        if (!product) {
          return json(
            {
              ok: false,
              error: "Product not found.",
            },
            404
          );
        }

        const updated =
          await service.entities.ExpertProduct.update(
            id,
            {
              active:
                product.active === false,
            }
          );

        return json({
          ok: true,
          product: updated,
        });
      } catch (error) {
        console.error(
          "expertAdmin toggle product:",
          error
        );

        return json(
          {
            ok: false,
            error:
              "Unable to change product status.",
          },
          500
        );
      }
    }

    if (action === "delete_product") {
      const id = clean(body.id, 200);

      if (!id) {
        return json(
          {
            ok: false,
            error: "Product ID is required.",
          },
          400
        );
      }

      try {
        await service.entities.ExpertProduct.delete(
          id
        );

        return json({
          ok: true,
          deletedId: id,
        });
      } catch (error) {
        console.error(
          "expertAdmin delete product:",
          error
        );

        return json(
          {
            ok: false,
            error:
              "Unable to delete product.",
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
      "expertAdmin fatal:",
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

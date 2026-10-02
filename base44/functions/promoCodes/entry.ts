import { createClientFromRequest } from "@base44/sdk";

const json = (data, status = 200) =>
  Response.json(data, {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });

const cleanCode = (value) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();

    if (!user?.email) {
      return json(
        {
          success: false,
          error: "Authentication required.",
        },
        401
      );
    }

    const body = await req.json().catch(() => ({}));

    const code = cleanCode(body.code);

    if (!code) {
      return json(
        {
          success: false,
          error: "Promo code is required.",
        },
        400
      );
    }

    const minFunding = Number(body.min_funding ?? 0);
    const bonusAmount = Number(body.bonus_amount ?? 0);
    const maxUses = Number(body.max_uses ?? 100);

    if (!Number.isFinite(minFunding) || minFunding < 0) {
      return json(
        {
          success: false,
          error: "Invalid minimum funding amount.",
        },
        400
      );
    }

    if (!Number.isFinite(maxUses) || maxUses <= 0) {
      return json(
        {
          success: false,
          error: "Maximum uses must be greater than zero.",
        },
        400
      );
    }

    if (
      body.benefit === "BONUS_CREDIT" &&
      (!Number.isFinite(bonusAmount) || bonusAmount <= 0)
    ) {
      return json(
        {
          success: false,
          error: "Invalid bonus amount.",
        },
        400
      );
    }

    /*
     * IMPORTANT:
     * Check ONLY this exact code.
     *
     * This allows:
     * WELCOME500
     * NEWUSER500
     * BABA1000
     * VIP2000
     *
     * to all exist at the same time.
     */
    const existing = await base44.entities.PromoCode.filter({
      code,
    });

    if (existing?.length > 0) {
      return json(
        {
          success: false,
          error: `Promo code ${code} already exists. Use a different code.`,
        },
        409
      );
    }

    const promo = await base44.entities.PromoCode.create({
      code,

      benefit: body.benefit || "BONUS_CREDIT",

      bonus_amount:
        body.benefit === "BONUS_CREDIT"
          ? bonusAmount
          : 0,

      min_funding: minFunding,

      max_uses: maxUses,

      current_uses: 0,

      active:
        body.active !== undefined
          ? Boolean(body.active)
          : true,

      start_date:
        body.start_date ||
        new Date().toISOString(),

      end_date:
        body.end_date ||
        new Date(
          Date.now() + 30 * 86400000
        ).toISOString(),

      created_at: new Date().toISOString(),

      created_by: user.email,
    });

    /*
     * Optional admin notification.
     * If your Notification entity exists, this creates
     * an admin notification without preventing the promo
     * from being created if notification creation fails.
     */
    try {
      if (base44.entities?.Notification?.create) {
        await base44.entities.Notification.create({
          type: "promo_created",
          title: "New Promo Code Created",
          message: `${code} was created with a minimum funding requirement of ₦${minFunding.toLocaleString()} and bonus of ₦${bonusAmount.toLocaleString()}.`,
          userEmail: user.email,
          read: false,
          createdAt: new Date().toISOString(),
        });
      }
    } catch (notificationError) {
      console.warn(
        "Promo notification failed:",
        notificationError
      );
    }

    return json({
      success: true,
      promo,
    });
  } catch (error) {
    console.error(
      "CREATE PROMO CODE ERROR:",
      error
    );

    return json(
      {
        success: false,
        error:
          error?.message ||
          "Unable to create promo code.",
      },
      500
    );
  }
});

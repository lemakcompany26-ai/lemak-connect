import { createClientFromRequest } from "@base44/sdk";

const json = (data: unknown, status = 200) =>
  Response.json(data, {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });

const cleanCode = (value: unknown) =>
  String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");

const getAction = (body: any) =>
  String(body?.action ?? "list")
    .trim()
    .toLowerCase();

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
    const action = getAction(body);

    /* =========================================================
       LIST PROMO CODES
    ========================================================= */

    if (
      action === "list" ||
      action === "get" ||
      action === "getpromocodes"
    ) {
      const promos =
        await base44.entities.PromoCode.list();

      return json({
        success: true,
        promos: promos || [],
      });
    }

    /* =========================================================
       CREATE PROMO CODE
    ========================================================= */

    if (
      action === "create" ||
      action === "createpromocode"
    ) {
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

      const minFunding = Number(
        body.min_funding ?? 0
      );

      const bonusAmount = Number(
        body.bonus_amount ?? 0
      );

      const maxUses = Number(
        body.max_uses ?? 100
      );

      if (
        !Number.isFinite(minFunding) ||
        minFunding < 0
      ) {
        return json(
          {
            success: false,
            error:
              "Minimum funding must be a valid amount.",
          },
          400
        );
      }

      if (
        !Number.isFinite(maxUses) ||
        maxUses <= 0
      ) {
        return json(
          {
            success: false,
            error:
              "Maximum uses must be greater than zero.",
          },
          400
        );
      }

      if (
        body.benefit === "BONUS_CREDIT" &&
        (!Number.isFinite(bonusAmount) ||
          bonusAmount <= 0)
      ) {
        return json(
          {
            success: false,
            error:
              "Bonus amount must be greater than zero.",
          },
          400
        );
      }

      /*
       * IMPORTANT:
       * Check only the exact code.
       *
       * This allows multiple different promo codes:
       *
       * BABAALADO1
       * WELCOME500
       * NEWUSER1000
       * VIP2000
       */

      const existing =
        await base44.entities.PromoCode.filter({
          code,
        });

      if (
        Array.isArray(existing) &&
        existing.length > 0
      ) {
        return json(
          {
            success: false,
            error: `Promo code ${code} already exists. Please use another code.`,
          },
          409
        );
      }

      const startDate =
        body.start_date ||
        new Date().toISOString();

      const endDate =
        body.end_date ||
        new Date(
          Date.now() +
            30 * 24 * 60 * 60 * 1000
        ).toISOString();

      const promo =
        await base44.entities.PromoCode.create({
          code,

          benefit:
            body.benefit ||
            "BONUS_CREDIT",

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

          start_date: startDate,

          end_date: endDate,

          created_at:
            new Date().toISOString(),

          created_by: user.email,
        });

      /*
       * Admin notification.
       * Notification failure must never undo
       * a successfully-created promo.
       */

      try {
        if (
          base44.entities?.Notification?.create
        ) {
          await base44.entities.Notification.create(
            {
              type: "promo_created",

              title:
                "Promo Code Created",

              message:
                `Promo ${code} was created successfully. ` +
                `Minimum funding: ₦${minFunding.toLocaleString()}. ` +
                `Bonus: ₦${bonusAmount.toLocaleString()}.`,

              userEmail: user.email,

              read: false,

              createdAt:
                new Date().toISOString(),
            }
          );
        }
      } catch (notificationError) {
        console.warn(
          "Promo notification failed:",
          notificationError
        );
      }

      return json({
        success: true,

        message:
          `Promo code ${code} created successfully.`,

        promo,
      });
    }

    /* =========================================================
       UPDATE / ENABLE / DISABLE
    ========================================================= */

    if (
      action === "update" ||
      action === "updatepromocode"
    ) {
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

      const promos =
        await base44.entities.PromoCode.filter({
          code,
        });

      if (!promos?.length) {
        return json(
          {
            success: false,
            error: `Promo code ${code} was not found.`,
          },
          404
        );
      }

      const promo = promos[0];

      const updates: Record<string, unknown> =
        {};

      if (body.active !== undefined) {
        updates.active = Boolean(
          body.active
        );
      }

      if (body.min_funding !== undefined) {
        updates.min_funding = Number(
          body.min_funding
        );
      }

      if (body.bonus_amount !== undefined) {
        updates.bonus_amount = Number(
          body.bonus_amount
        );
      }

      if (body.max_uses !== undefined) {
        updates.max_uses = Number(
          body.max_uses
        );
      }

      if (body.start_date !== undefined) {
        updates.start_date =
          body.start_date;
      }

      if (body.end_date !== undefined) {
        updates.end_date =
          body.end_date;
      }

      const updated =
        await base44.entities.PromoCode.update(
          promo.id,
          updates
        );

      return json({
        success: true,
        message:
          `Promo code ${code} updated successfully.`,
        promo: updated,
      });
    }

    /* =========================================================
       DELETE
    ========================================================= */

    if (
      action === "delete" ||
      action === "deletepromocode"
    ) {
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

      const promos =
        await base44.entities.PromoCode.filter({
          code,
        });

      if (!promos?.length) {
        return json(
          {
            success: false,
            error: `Promo code ${code} was not found.`,
          },
          404
        );
      }

      await base44.entities.PromoCode.delete(
        promos[0].id
      );

      return json({
        success: true,
        message:
          `Promo code ${code} deleted successfully.`,
      });
    }

    /* =========================================================
       APPLY / CHECK PROMO
       Does NOT release the bonus yet.
       The funding backend will release it after
       verified wallet funding.
    ========================================================= */

    if (
      action === "validate" ||
      action === "check" ||
      action === "apply"
    ) {
      const code = cleanCode(body.code);

      if (!code) {
        return json(
          {
            success: false,
            error: "Enter a promo code.",
          },
          400
        );
      }

      const promos =
        await base44.entities.PromoCode.filter({
          code,
        });

      if (!promos?.length) {
        return json(
          {
            success: false,
            error:
              "This promo code does not exist.",
          },
          404
        );
      }

      const promo = promos[0];

      if (!promo.active) {
        return json(
          {
            success: false,
            error:
              "This promo code is currently inactive.",
          },
          400
        );
      }

      const now = Date.now();

      if (
        promo.start_date &&
        new Date(promo.start_date).getTime() >
          now
      ) {
        return json(
          {
            success: false,
            error:
              "This promo code has not started yet.",
          },
          400
        );
      }

      if (
        promo.end_date &&
        new Date(promo.end_date).getTime() <
          now
      ) {
        return json(
          {
            success: false,
            error:
              "This promo code has expired.",
          },
          400
        );
      }

      const currentUses = Number(
        promo.current_uses ?? 0
      );

      const maxUses = Number(
        promo.max_uses ?? 0
      );

      if (
        maxUses > 0 &&
        currentUses >= maxUses
      ) {
        return json(
          {
            success: false,
            error:
              "This promo code has reached its maximum uses.",
          },
          400
        );
      }

      return json({
        success: true,

        valid: true,

        promo: {
          id: promo.id,

          code: promo.code,

          benefit:
            promo.benefit ||
            "BONUS_CREDIT",

          bonus_amount:
            Number(
              promo.bonus_amount ?? 0
            ),

          min_funding:
            Number(
              promo.min_funding ?? 0
            ),

          current_uses:
            currentUses,

          max_uses:
            maxUses,
        },

        message:
          `Promo accepted. Fund at least ₦${Number(
            promo.min_funding ?? 0
          ).toLocaleString()} to qualify for the bonus.`,
      });
    }

    /* =========================================================
       UNKNOWN ACTION
    ========================================================= */

    return json(
      {
        success: false,

        error:
          `Unknown promo action: ${action}`,

        availableActions: [
          "list",
          "create",
          "update",
          "delete",
          "validate",
        ],
      },
      400
    );
  } catch (error) {
    console.error(
      "PROMOCODES FUNCTION ERROR:",
      error
    );

    return json(
      {
        success: false,
        error:
          error?.message ||
          "Promo code operation failed.",
      },
      500
    );
  }
});

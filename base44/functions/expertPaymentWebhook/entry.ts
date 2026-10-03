import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { secrets } from "base44:runtime";

const KORA_API =
  "https://api.korapay.com/merchant/api/v1";

const ADMIN_EMAIL =
  "lemakcompany26@gmail.com";

const ADMIN_WHATSAPP =
  "2349022143559";

function safeText(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function safeEqual(
  a: string,
  b: string
) {
  if (!a || !b || a.length !== b.length) {
    return false;
  }

  let result = 0;

  for (let i = 0; i < a.length; i++) {
    result |=
      a.charCodeAt(i) ^
      b.charCodeAt(i);
  }

  return result === 0;
}

async function createHmac(
  secret: string,
  value: string
) {
  const key =
    await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      {
        name: "HMAC",
        hash: "SHA-256",
      },
      false,
      ["sign"]
    );

  const signature =
    await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(value)
    );

  return Array.from(
    new Uint8Array(signature)
  )
    .map((byte) =>
      byte
        .toString(16)
        .padStart(2, "0")
    )
    .join("");
}

async function sendResendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const apiKey =
    secrets.get("RESEND_API_KEY");

  const from =
    secrets.get(
      "RESEND_FROM_EMAIL"
    );

  if (!apiKey) {
    throw new Error(
      "RESEND_API_KEY is missing"
    );
  }

  if (!from) {
    throw new Error(
      "RESEND_FROM_EMAIL is missing"
    );
  }

  const response =
    await fetch(
      "https://api.resend.com/emails",
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${apiKey}`,

          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          from,
          to: [to],
          subject,
          html,
        }),
      }
    );

  const result =
    await response
      .json()
      .catch(() => null);

  if (!response.ok) {
    throw new Error(
      result?.message ||
        "Resend failed to send email."
    );
  }

  return result;
}

export default async function (
  req: Request
): Promise<Response> {
  try {
    if (req.method !== "POST") {
      return Response.json(
        {
          error:
            "Method not allowed",
        },
        { status: 405 }
      );
    }

    const rawBody =
      await req.text();

    const signature =
      req.headers.get(
        "x-korapay-signature"
      ) || "";

    const koraSecret =
      secrets.get(
        "KORA_SECRET_KEY"
      );

    if (!koraSecret) {
      return Response.json(
        {
          error:
            "Webhook unavailable",
        },
        { status: 503 }
      );
    }

    /*
     * Verify webhook signature.
     */
    const expectedSignature =
      await createHmac(
        koraSecret,
        rawBody
      );

    if (
      !safeEqual(
        signature,
        expectedSignature
      )
    ) {
      console.error(
        "Invalid KoraPay webhook signature."
      );

      return Response.json(
        {
          error:
            "Invalid signature",
        },
        { status: 401 }
      );
    }

    let payload;

    try {
      payload =
        JSON.parse(
          rawBody
        );
    } catch {
      return Response.json(
        {
          error:
            "Invalid JSON",
        },
        { status: 400 }
      );
    }

    const event =
      String(
        payload?.event || ""
      );

    const data =
      payload?.data || {};

    if (
      event !==
      "charge.success"
    ) {
      return Response.json({
        ok: true,
        ignored: true,
      });
    }

    const reference =
      String(
        data.reference || ""
      );

    if (
      !reference.startsWith(
        "LMK-EXP-"
      )
    ) {
      return Response.json({
        ok: true,
        ignored: true,
      });
    }

    const base44 =
      createClientFromRequest(
        req
      );

    const service =
      base44.asServiceRole;

    const payments =
      await service.entities.ExpertPayment.filter(
        {
          reference,
        },
        "-created_date",
        1
      );

    const payment =
      payments?.[0];

    if (!payment) {
      console.error(
        "Expert payment not found:",
        reference
      );

      return Response.json(
        {
          error:
            "Payment not found",
        },
        { status: 404 }
      );
    }

    /*
     * Idempotency.
     * KoraPay can retry a webhook.
     */
    if (
      payment.status ===
      "successful"
    ) {
      return Response.json({
        ok: true,
        alreadyProcessed: true,
      });
    }

    /*
     * Verify directly with KoraPay.
     */
    const verifyResponse =
      await fetch(
        `${KORA_API}/charges/${encodeURIComponent(
          reference
        )}`,
        {
          method: "GET",

          headers: {
            Authorization:
              `Bearer ${koraSecret}`,

            "Content-Type":
              "application/json",
          },
        }
      );

    const verified =
      await verifyResponse
        .json()
        .catch(() => null);

    if (
      !verifyResponse.ok ||
      verified?.status !== true ||
      !verified?.data
    ) {
      console.error(
        "KoraPay verification failed:",
        verified
      );

      return Response.json(
        {
          error:
            "Payment verification failed",
        },
        { status: 400 }
      );
    }

    const verifiedData =
      verified.data;

    const paidAmount =
      Number(
        verifiedData.amount
      );

    const expectedAmount =
      Number(payment.amount) /
      100;

    if (
      !Number.isFinite(
        paidAmount
      ) ||
      Math.abs(
        paidAmount -
          expectedAmount
      ) > 0.01
    ) {
      console.error(
        "Amount mismatch:",
        {
          paidAmount,
          expectedAmount,
          reference,
        }
      );

      return Response.json(
        {
          error:
            "Payment amount mismatch",
        },
        { status: 400 }
      );
    }

    const bookings =
      await service.entities.ExpertBooking.filter(
        {
          paymentReference:
            reference,
        },
        "-created_date",
        1
      );

    const booking =
      bookings?.[0];

    if (!booking) {
      return Response.json(
        {
          error:
            "Booking not found",
        },
        { status: 404 }
      );
    }

    /*
     * Mark payment as successful.
     */
    await service.entities.ExpertPayment.update(
      payment.id,
      {
        status:
          "successful",

        paidAt:
          new Date().toISOString(),

        providerReference:
          verifiedData.reference ||
          reference,

        providerTransactionId:
          verifiedData.id ||
          verifiedData.transaction_id ||
          null,
      }
    );

    /*
     * Confirm booking.
     */
    await service.entities.ExpertBooking.update(
      booking.id,
      {
        paymentStatus:
          "paid",

        bookingStatus:
          "confirmed",

        paidAt:
          new Date().toISOString(),
      }
    );

    const amount =
      Number(
        booking.amount
      ).toLocaleString(
        "en-NG"
      );

    const customerName =
      safeText(
        booking.customerName
      );

    const customerEmail =
      safeText(
        booking.customerEmail
      );

    const category =
      safeText(
        booking.categoryName
      );

    const option =
      safeText(
        booking.optionName
      );

    const bookingLocation =
      safeText(
        booking.location
      );

    const bookingDate =
      safeText(
        booking.bookingDate
      );

    const bookingReference =
      safeText(
        reference
      );

    /*
     * Customer confirmation email.
     */
    try {
      await sendResendEmail({
        to:
          booking.customerEmail,

        subject:
          `Lemak Expert Product Booking Confirmed - ${reference}`,

        html: `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
</head>

<body style="margin:0;padding:30px;background:#f4f7fb;font-family:Arial,sans-serif;color:#172033">

<div style="max-width:650px;margin:auto;background:white;border-radius:18px;padding:30px">

<h2 style="color:#155eef">
LEMAK EXPERT PRODUCT
</h2>

<h3>Booking Confirmed</h3>

<p>
Hello ${customerName},
</p>

<p>
Your service booking has been successfully paid for and confirmed.
</p>

<div style="background:#f7f9fc;border-radius:12px;padding:18px">

<p>
<strong>Service:</strong>
${category}
</p>

<p>
<strong>Selected service:</strong>
${option}
</p>

<p>
<strong>Quantity:</strong>
${booking.quantity}
</p>

<p>
<strong>Service date:</strong>
${bookingDate}
</p>

<p>
<strong>Location:</strong>
${bookingLocation}
</p>

<p>
<strong>Amount paid:</strong>
₦${amount}
</p>

<p>
<strong>Payment reference:</strong>
${bookingReference}
</p>

</div>

<p>
Our team will review your booking and respond within 24 hours.
</p>

<p>
Thank you for choosing Lemak Company.
</p>

<p style="color:#667085;font-size:12px">
Developed by MOSCO under Lemak Company.
</p>

</div>

</body>
</html>
        `,
      });
    } catch (emailError) {
      /*
       * Payment remains successful even if
       * an email temporarily fails.
       */
      console.error(
        "Customer Resend email failed:",
        emailError
      );
    }

    /*
     * Admin WhatsApp pre-filled message.
     */
    const whatsappText =
      encodeURIComponent(
        `NEW LEMAK EXPERT PRODUCT BOOKING

Reference: ${reference}

Customer: ${booking.customerName}
Email: ${booking.customerEmail}

Service: ${booking.categoryName}
Selected service: ${booking.optionName}

Quantity: ${booking.quantity}
Date: ${booking.bookingDate}

Location: ${booking.location}

Amount: ₦${amount}

Payment: SUCCESSFUL`
      );

    const whatsappLink =
      `https://wa.me/${ADMIN_WHATSAPP}?text=${whatsappText}`;

    /*
     * Admin notification.
     */
    try {
      await sendResendEmail({
        to:
          ADMIN_EMAIL,

        subject:
          `New Paid Expert Product Booking - ${reference}`,

        html: `
<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;background:#f4f7fb;padding:30px">

<div style="max-width:650px;margin:auto;background:white;border-radius:18px;padding:30px">

<h2>
New Paid Booking
</h2>

<p>
A new LEMAK EXPERT PRODUCT booking has been successfully paid for.
</p>

<hr>

<p>
<strong>Reference:</strong>
${bookingReference}
</p>

<p>
<strong>Customer:</strong>
${customerName}
</p>

<p>
<strong>Email:</strong>
${customerEmail}
</p>

<p>
<strong>Service:</strong>
${category}
</p>

<p>
<strong>Selected service:</strong>
${option}
</p>

<p>
<strong>Quantity:</strong>
${booking.quantity}
</p>

<p>
<strong>Date:</strong>
${bookingDate}
</p>

<p>
<strong>Location:</strong>
${bookingLocation}
</p>

<p>
<strong>Amount:</strong>
₦${amount}
</p>

<p>
<strong>Payment:</strong>
SUCCESSFUL
</p>

<a
href="${whatsappLink}"
style="display:inline-block;background:#25D366;color:white;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:bold"
>
Open WhatsApp Message
</a>

</div>

</body>
</html>
        `,
      });
    } catch (emailError) {
      console.error(
        "Admin Resend email failed:",
        emailError
      );
    }

    return Response.json({
      ok: true,
      processed: true,
      reference,
      bookingId:
        booking.id,
    });

  } catch (error) {
    console.error(
      "expertPaymentWebhook:",
      error
    );

    return Response.json(
      {
        error:
          "Webhook processing failed",
      },
      { status: 500 }
    );
  }
          }

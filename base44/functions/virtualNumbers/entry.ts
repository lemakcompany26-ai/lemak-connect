if (action === "order") {
  try {
    const userEmail = String(body.userEmail || "").trim();
    const serverId = String(body.serverId || "");
    const service = String(body.service || "");
    const realId = String(body.realId || service);

    if (!userEmail) {
      return response({
        success: false,
        error: "User email is missing."
      });
    }

    if (!service) {
      return response({
        success: false,
        error: "Service is missing."
      });
    }

    console.log("=== VIRTUAL NUMBER ORDER START ===");
    console.log("serverId:", serverId);
    console.log("service:", service);
    console.log("realId:", realId);
    console.log("country:", body.country);
    console.log("countryProviderId:", body.countryProviderId);
    console.log("userEmail:", userEmail);

    // -----------------------------------------------------
    // GET WALLET
    // -----------------------------------------------------

    const wallets =
      await base44.entities.Wallet.filter({
        userEmail
      });

    console.log(
      "Wallet lookup result:",
      JSON.stringify(wallets)
    );

    const wallet = wallets?.[0];

    if (!wallet) {
      return response({
        success: false,
        error:
          "Wallet not found for this account."
      });
    }

    const walletBalance =
      Number(wallet.balance || 0);

    console.log(
      "Wallet balance:",
      walletBalance
    );

    // -----------------------------------------------------
    // FLEEXA
    // -----------------------------------------------------

    if (serverId === "a") {
      if (!FLEEXA_KEY) {
        return response({
          success: false,
          error:
            "FLEEXA_API_KEY is not configured in Base44 Secrets."
        });
      }

      console.log(
        "FLEEXA ORDER - service:",
        realId
      );

      // Get REAL Fleexa price first.
      const priceUrl =
        `${FLEEXA_BASE}/sms4/prices?serviceName=` +
        encodeURIComponent(realId);

      console.log(
        "Fleexa price URL:",
        priceUrl
      );

      const priceResponse =
        await fetch(priceUrl, {
          method: "GET",
          headers: {
            Authorization:
              `Bearer ${FLEEXA_KEY}`,
            "X-API-Key":
              FLEEXA_KEY,
            "Content-Type":
              "application/json"
          }
        });

      const priceData =
        await priceResponse
          .json()
          .catch(() => ({}));

      console.log(
        "Fleexa price response:",
        JSON.stringify(priceData)
      );

      if (!priceResponse.ok) {
        return response({
          success: false,
          error:
            `Fleexa price request failed (${priceResponse.status}): ` +
            JSON.stringify(priceData)
        });
      }

      const providerPrice = Number(
        priceData?.price_ngn ??
        priceData?.rate ??
        priceData?.price ??
        priceData?.data?.price_ngn ??
        priceData?.data?.rate ??
        priceData?.data?.price ??
        0
      );

      if (!providerPrice || providerPrice <= 0) {
        return response({
          success: false,
          error:
            "Fleexa returned no valid price for this service."
        });
      }

      // Your customer markup.
      const customerPrice =
        Math.ceil(providerPrice * 1.30);

      console.log(
        "Fleexa provider price:",
        providerPrice
      );

      console.log(
        "Lemak customer price:",
        customerPrice
      );

      if (
        walletBalance <
        customerPrice
      ) {
        return response({
          success: false,
          error:
            `Insufficient wallet balance. Required ${customerPrice} NGN, available ${walletBalance} NGN.`
        });
      }

      // ---------------------------------------------------
      // PURCHASE REAL FLEEXA NUMBER
      // ---------------------------------------------------

      console.log(
        "Sending Fleexa purchase..."
      );

      const buyResponse =
        await fetch(
          `${FLEEXA_BASE}/sms4/buy`,
          {
            method: "POST",
            headers: {
              Authorization:
                `Bearer ${FLEEXA_KEY}`,
              "X-API-Key":
                FLEEXA_KEY,
              "Content-Type":
                "application/json"
            },
            body: JSON.stringify({
              serviceName: realId,
              maxPrice: String(
                providerPrice
              )
            })
          }
        );

      const buyData =
        await buyResponse
          .json()
          .catch(() => ({}));

      console.log(
        "Fleexa BUY response:",
        JSON.stringify(buyData)
      );

      if (
        !buyResponse.ok ||
        buyData?.success !== true
      ) {
        return response({
          success: false,
          error:
            buyData?.message ||
            buyData?.error ||
            `Fleexa rejected purchase (${buyResponse.status}).`,
          providerResponse:
            buyData
        });
      }

      const purchase =
        buyData?.data ||
        buyData;

      const phone =
        purchase?.phone ||
        purchase?.number ||
        "";

      const activationId =
        purchase?.activation_id ||
        purchase?.requestId ||
        purchase?.id ||
        "";

      if (!phone) {
        return response({
          success: false,
          error:
            "Fleexa accepted the order but returned no phone number.",
          providerResponse:
            buyData
        });
      }

      if (!activationId) {
        return response({
          success: false,
          error:
            "Fleexa returned a phone number but no activation/order ID.",
          providerResponse:
            buyData
        });
      }

      console.log(
        "REAL FLEEXA NUMBER:",
        phone
      );

      console.log(
        "FLEEXA ACTIVATION ID:",
        activationId
      );

      // ---------------------------------------------------
      // SAVE RENTAL
      // ---------------------------------------------------

      let rental;

      try {
        rental =
          await base44.entities.Rental.create({
            userEmail,
            phoneNumber: phone,
            orderId:
              `fleexa_${activationId}`,
            serverId: "a",
            country:
              body.country || "US",
            service,
            status:
              "waiting_sms"
          });
      } catch (rentalError) {
        console.error(
          "RENTAL CREATE ERROR:",
          rentalError
        );

        /*
         * IMPORTANT:
         * The provider already delivered a real
         * number. Return that information instead
         * of hiding it behind HTTP 500.
         */

        return response({
          success: false,
          providerPurchased: true,
          phone,
          orderId:
            `fleexa_${activationId}`,
          error:
            "Number was purchased from Fleexa, but Lemak Connect could not save the rental record. Contact admin before trying again.",
          details:
            String(rentalError)
        });
      }

      // ---------------------------------------------------
      // DEDUCT WALLET
      // ---------------------------------------------------

      try {
        await base44.entities.Wallet.update(
          wallet.id,
          {
            balance:
              walletBalance -
              customerPrice
          }
        );
      } catch (walletError) {
        console.error(
          "WALLET UPDATE ERROR:",
          walletError
        );

        return response({
          success: true,
          warning:
            "Number purchased and rental saved, but wallet update failed. Admin should reconcile this transaction.",
          phone,
          orderId:
            `fleexa_${activationId}`,
          rentalId:
            rental?.id,
          charged:
            customerPrice
        });
      }

      console.log(
        "=== FLEEXA ORDER SUCCESS ==="
      );

      return response({
        success: true,
        phone,
        orderId:
          `fleexa_${activationId}`,
        rentalId:
          rental?.id,
        charged:
          customerPrice,
        providerPrice
      });
    }

    // -----------------------------------------------------
    // SMSPOOL
    // -----------------------------------------------------

    if (serverId === "b") {
      if (!SMSPOOL_KEY) {
        return response({
          success: false,
          error:
            "SMSPOOL_API_KEY is not configured in Base44 Secrets."
        });
      }

      const country =
        String(
          body.countryProviderId ||
          body.country ||
          "US"
        );

      console.log(
        "SMSPOOL ORDER"
      );

      console.log(
        "Service:",
        realId
      );

      console.log(
        "Country:",
        country
      );

      // ---------------------------------------------------
      // GET SMSPOOL PRICE
      // ---------------------------------------------------

      const priceForm =
        new URLSearchParams();

      priceForm.append(
        "key",
        SMSPOOL_KEY
      );

      priceForm.append(
        "service",
        realId
      );

      priceForm.append(
        "country",
        country
      );

      const priceResponse =
        await fetch(
          `${SMSPOOL_BASE}/request/price`,
          {
            method: "POST",
            headers: {
              Authorization:
                `Bearer ${SMSPOOL_KEY}`,
              "Content-Type":
                "application/x-www-form-urlencoded"
            },
            body: priceForm
          }
        );

      const priceData =
        await priceResponse
          .json()
          .catch(() => ({}));

      console.log(
        "SMSPool price response:",
        JSON.stringify(priceData)
      );

      if (!priceResponse.ok) {
        return response({
          success: false,
          error:
            `SMSPool price request failed (${priceResponse.status}): ` +
            JSON.stringify(priceData)
        });
      }

      const usdPrice = Number(
        Array.isArray(priceData)
          ? (
              priceData[0]?.price ||
              priceData[0]?.cost
            )
          : (
              priceData?.price ||
              priceData?.cost ||
              priceData?.data?.price
            )
      );

      if (!usdPrice || usdPrice <= 0) {
        return response({
          success: false,
          error:
            "SMSPool returned no valid price.",
          providerResponse:
            priceData
        });
      }

      const rate =
        Number(
          Deno.env.get(
            "SMSPOOL_USD_NGN_RATE"
          ) || "1600"
        );

      const providerNgn =
        usdPrice * rate;

      const customerPrice =
        Math.ceil(
          providerNgn * 1.30
        );

      console.log(
        "SMSPool USD:",
        usdPrice
      );

      console.log(
        "SMSPool NGN:",
        providerNgn
      );

      console.log(
        "Customer price:",
        customerPrice
      );

      if (
        walletBalance <
        customerPrice
      ) {
        return response({
          success: false,
          error:
            `Insufficient wallet balance. Required ${customerPrice} NGN, available ${walletBalance} NGN.`
        });
      }

      // ---------------------------------------------------
      // PURCHASE SMSPOOL NUMBER
      // ---------------------------------------------------

      const orderForm =
        new URLSearchParams();

      orderForm.append(
        "key",
        SMSPOOL_KEY
      );

      orderForm.append(
        "country",
        country
      );

      orderForm.append(
        "service",
        realId
      );

      orderForm.append(
        "pool",
        "1"
      );

      console.log(
        "Sending SMSPool purchase..."
      );

      const orderResponse =
        await fetch(
          `${SMSPOOL_BASE}/purchase/sms`,
          {
            method: "POST",
            headers: {
              Authorization:
                `Bearer ${SMSPOOL_KEY}`,
              "Content-Type":
                "application/x-www-form-urlencoded"
            },
            body: orderForm
          }
        );

      const orderData =
        await orderResponse
          .json()
          .catch(() => ({}));

      console.log(
        "SMSPool purchase response:",
        JSON.stringify(orderData)
      );

      if (
        !orderResponse.ok ||
        !(
          orderData?.success === 1 ||
          orderData?.success === true
        )
      ) {
        return response({
          success: false,
          error:
            orderData?.message ||
            orderData?.type ||
            `SMSPool rejected purchase (${orderResponse.status}).`,
          providerResponse:
            orderData
        });
      }

      const phone =
        orderData?.phonenumber ||
        orderData?.number ||
        "";

      const providerOrderId =
        orderData?.order_id ||
        "";

      if (!phone) {
        return response({
          success: false,
          error:
            "SMSPool accepted the purchase but returned no phone number.",
          providerResponse:
            orderData
        });
      }

      if (!providerOrderId) {
        return response({
          success: false,
          error:
            "SMSPool returned a phone number but no order ID.",
          providerResponse:
            orderData
        });
      }

      console.log(
        "REAL SMSPOOL NUMBER:",
        phone
      );

      console.log(
        "SMSPOOL ORDER ID:",
        providerOrderId
      );

      // ---------------------------------------------------
      // SAVE RENTAL
      // ---------------------------------------------------

      let rental;

      try {
        rental =
          await base44.entities.Rental.create({
            userEmail,
            phoneNumber: String(
              phone
            ),
            orderId:
              `smspool_${providerOrderId}`,
            serverId: "b",
            country:
              body.country || country,
            service,
            status:
              "waiting_sms"
          });
      } catch (rentalError) {
        console.error(
          "RENTAL CREATE ERROR:",
          rentalError
        );

        return response({
          success: false,
          providerPurchased: true,
          phone: String(phone),
          orderId:
            `smspool_${providerOrderId}`,
          error:
            "SMSPool delivered a real number, but Lemak Connect could not save the rental record. Contact admin before trying again.",
          details:
            String(rentalError)
        });
      }

      // ---------------------------------------------------
      // DEDUCT WALLET
      // ---------------------------------------------------

      try {
        await base44.entities.Wallet.update(
          wallet.id,
          {
            balance:
              walletBalance -
              customerPrice
          }
        );
      } catch (walletError) {
        console.error(
          "WALLET UPDATE ERROR:",
          walletError
        );

        return response({
          success: true,
          warning:
            "Number purchased and rental saved, but wallet update failed. Admin should reconcile this transaction.",
          phone: String(phone),
          orderId:
            `smspool_${providerOrderId}`,
          rentalId:
            rental?.id,
          charged:
            customerPrice
        });
      }

      console.log(
        "=== SMSPOOL ORDER SUCCESS ==="
      );

      return response({
        success: true,
        phone: String(phone),
        orderId:
          `smspool_${providerOrderId}`,
        rentalId:
          rental?.id,
        charged:
          customerPrice,
        providerPrice:
          usdPrice,
        providerCurrency:
          "USD"
      });
    }

    return response({
      success: false,
      error:
        `Unknown server ID: ${serverId}`
    });

  } catch (error) {
    console.error(
      "================================"
    );

    console.error(
      "VIRTUAL NUMBERS 500 ERROR:"
    );

    console.error(
      error
    );

    console.error(
      "================================"
    );

    return response({
      success: false,
      error:
        error?.message ||
        String(error) ||
        "Unknown backend error"
    });
  }
                        }

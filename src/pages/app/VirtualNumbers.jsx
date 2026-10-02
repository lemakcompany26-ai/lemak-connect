const handleBuy = async (item) => {
  if (!catalog) return;

  const priceData = prices[item.id];

  if (!priceData?.customerPrice) {
    alert(
      "The live provider price has not loaded yet. Please wait a moment and try again."
    );
    return;
  }

  const price = Number(priceData.customerPrice);

  const confirmed = window.confirm(
    `Buy ${item.name || item.id} for ${formatNaira(price)}?\n\n` +
    `Country: ${countryName || country || "United States"}\n` +
    `Provider: ${
      catalog.id === "a" ? "Fleexa" : "SMSPool"
    }\n\n` +
    `Press OK to purchase a REAL number.`
  );

  if (!confirmed) return;

  setBuying(item.id);
  setError("");

  try {
    console.log("BUY STARTED", {
      serverId: catalog.id,
      service: item.id,
      realId: item.realId,
      country,
      countryProviderId,
      price,
    });

    const user = await base44.auth.me();

    console.log("AUTH USER", user);

    if (!user?.email) {
      throw new Error(
        "Your account session has expired. Please log in again."
      );
    }

    const result = await base44.functions.invoke(
      "virtualNumbers",
      {
        action: "order",

        serverId: catalog.id,

        service: item.id,

        // VERY IMPORTANT:
        // Send the provider's real service ID.
        realId: item.realId,

        country: country || "US",

        countryName:
          countryName ||
          "United States",

        countryProviderId:
          countryProviderId ||
          country ||
          "US",

        price,

        userEmail: user.email,
      }
    );

    console.log(
      "VIRTUAL NUMBER RESPONSE",
      result
    );

    const data =
      result?.data || result;

    if (!data) {
      throw new Error(
        "The virtual-number server returned no response."
      );
    }

    if (!data.success) {
      throw new Error(
        data.error ||
          data.message ||
          "The provider rejected the purchase."
      );
    }

    if (!data.phone) {
      throw new Error(
        "Provider accepted the order but did not return a phone number."
      );
    }

    /*
     * DO NOT REDIRECT IMMEDIATELY.
     * Show the real number first.
     */

    const message =
      `REAL NUMBER PURCHASED SUCCESSFULLY!\n\n` +
      `Number: ${data.phone}\n` +
      `Service: ${item.name || item.id}\n` +
      `Country: ${countryName || country}\n` +
      `Charged: ${formatNaira(
        Number(data.charged || price)
      )}\n\n` +
      `Order ID: ${data.orderId || "N/A"}`;

    alert(message);

    /*
     * Save the number temporarily so the UI can display it.
     */

    setPurchasedNumber({
      phone: data.phone,
      orderId: data.orderId,
      rentalId: data.rentalId,
      service: item.name || item.id,
      country: countryName || country,
      price: Number(
        data.charged || price
      ),
    });

  } catch (e) {
    console.error(
      "VIRTUAL NUMBER PURCHASE ERROR:",
      e
    );

    const message =
      e?.message ||
      "Unable to purchase the number.";

    setError(
      `Purchase failed: ${message}`
    );

    alert(
      `Purchase failed.\n\n${message}`
    );
  } finally {
    setBuying(null);
  }
};

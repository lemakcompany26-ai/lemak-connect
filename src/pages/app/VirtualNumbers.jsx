import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { base44 } from "@/api/base44Client";

import {
  ArrowLeft,
  Check,
  ChevronDown,
  Copy,
  Globe2,
  Loader2,
  MessageSquare,
  Phone,
  RefreshCw,
  Server,
  ShieldCheck,
  Smartphone,
} from "lucide-react";

import { Button } from "@/components/ui/button";

export default function VirtualNumbers() {
  const [server, setServer] = useState(null);

  const [services, setServices] = useState([]);
  const [countries, setCountries] = useState([]);

  const [selectedService, setSelectedService] = useState(null);
  const [selectedCountry, setSelectedCountry] = useState(null);

  const [prices, setPrices] = useState({});

  const [loading, setLoading] = useState(false);
  const [loadingServices, setLoadingServices] = useState(false);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingPrices, setLoadingPrices] = useState(false);

  const [buying, setBuying] = useState(false);

  const [error, setError] = useState("");

  const [purchasedNumber, setPurchasedNumber] = useState(null);

  const [otp, setOtp] = useState("");
  const [otpMessage, setOtpMessage] = useState("");
  const [checkingOtp, setCheckingOtp] = useState(false);

  const [showServerMenu, setShowServerMenu] = useState(false);
  const [showCountryMenu, setShowCountryMenu] = useState(false);

  const [copied, setCopied] = useState(false);

  const formatNaira = (amount) => {
    const value = Number(amount || 0);

    return `₦${value.toLocaleString("en-NG", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  };

  /*
   * =====================================================
   * BACKEND CALL
   * =====================================================
   */

  const callBackend = useCallback(async (payload) => {
    console.log("VIRTUAL NUMBERS REQUEST:", payload);

    try {
      const result = await base44.functions.invoke(
        "virtualNumbers",
        payload
      );

      console.log("VIRTUAL NUMBERS RAW RESPONSE:", result);

      const data = result?.data ?? result;

      console.log("VIRTUAL NUMBERS RESPONSE DATA:", data);

      if (!data) {
        throw new Error(
          "Virtual-number server returned no response."
        );
      }

      if (data.success === false) {
        throw new Error(
          data.error ||
            data.message ||
            `Request failed for action: ${
              payload?.action || "unknown"
            }`
        );
      }

      return data;
    } catch (err) {
      console.error("VIRTUAL NUMBERS FUNCTION ERROR:", err);

      const backendMessage =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.data?.error ||
        err?.data?.message ||
        err?.message;

      throw new Error(
        backendMessage ||
          `Virtual-number request failed for action: ${
            payload?.action || "unknown"
          }`
      );
    }
  }, []);

  /*
   * =====================================================
   * SERVER LIST
   *
   * IMPORTANT:
   * Provider names are intentionally NOT displayed.
   * =====================================================
   */

  const serverOptions = useMemo(
    () => [
      {
        id: "a",
        name: "Server 1",
        description:
          "US virtual numbers • WhatsApp • SMS OTP • Email OTP",
        country: "United States",
        icon: Smartphone,
      },
      {
        id: "b",
        name: "Server 2",
        description:
          "International virtual numbers • SMS OTP",
        country: "Multiple countries",
        icon: Globe2,
      },
    ],
    []
  );

  /*
   * =====================================================
   * LOAD SERVERS
   * =====================================================
   */

  const loadServers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await callBackend({
        action: "catalog",
      });

      if (!Array.isArray(data?.servers)) {
        throw new Error(
          "No virtual-number servers were returned."
        );
      }

      setServer(null);
      setServices([]);
      setCountries([]);
      setSelectedService(null);
      setSelectedCountry(null);
      setPrices({});
      setPurchasedNumber(null);
    } catch (err) {
      console.error("LOAD SERVERS ERROR:", err);

      setError(
        err?.message ||
          "Unable to load virtual-number servers."
      );
    } finally {
      setLoading(false);
    }
  }, [callBackend]);

  useEffect(() => {
    loadServers();
  }, [loadServers]);

  /*
   * =====================================================
   * LOAD LIVE PRICE FOR ONE SERVICE
   * =====================================================
   */

  const getServicePrice = useCallback(
    async (serverId, service, countryId) => {
      const serviceId =
        service?.realId ||
        service?.id;

      if (!serviceId) {
        return null;
      }

      try {
        const data = await callBackend({
          action: "price",
          serverId,
          service: serviceId,
          realId: serviceId,
          country:
            countryId ||
            (serverId === "a" ? "US" : ""),
          countryProviderId:
            countryId ||
            (serverId === "a" ? "US" : ""),
        });

        if (
          data?.customerPrice &&
          Number(data.customerPrice) > 0
        ) {
          return {
            providerPrice:
              Number(data.providerPrice || 0),
            customerPrice:
              Number(data.customerPrice || 0),
            currency:
              data.currency || "NGN",
            available:
              data.available !== false,
          };
        }

        return {
          providerPrice: 0,
          customerPrice: 0,
          currency: "NGN",
          available: false,
        };
      } catch (err) {
        console.warn(
          "SERVICE PRICE FAILED:",
          serviceId,
          err
        );

        return {
          providerPrice: 0,
          customerPrice: 0,
          currency: "NGN",
          available: false,
        };
      }
    },
    [callBackend]
  );

  /*
   * =====================================================
   * LOAD PRICES
   * =====================================================
   */

  const loadServicePrices = useCallback(
    async (
      serverId,
      serviceList,
      countryId
    ) => {
      if (
        !Array.isArray(serviceList) ||
        serviceList.length === 0
      ) {
        setPrices({});
        return;
      }

      try {
        setLoadingPrices(true);

        const nextPrices = {};

        /*
         * Sequential requests.
         * This prevents hammering the provider API.
         */
        for (const service of serviceList) {
          const serviceId =
            service?.realId ||
            service?.id;

          if (!serviceId) {
            continue;
          }

          const price =
            await getServicePrice(
              serverId,
              service,
              countryId
            );

          nextPrices[serviceId] =
            price;
        }

        setPrices(nextPrices);
      } finally {
        setLoadingPrices(false);
      }
    },
    [getServicePrice]
  );

  /*
   * =====================================================
   * LOAD FLEEXA SERVICES
   *
   * Provider name is NOT exposed to UI.
   * =====================================================
   */

  const loadFleexaServices =
    useCallback(async () => {
      try {
        setLoadingServices(true);
        setError("");

        const data = await callBackend({
          action: "services",
          serverId: "a",
        });

        let list = Array.isArray(
          data?.services
        )
          ? data.services
          : [];

        /*
         * WhatsApp always first.
         */
        list = [...list].sort((a, b) => {
          const aName = String(
            a?.name ||
              a?.id ||
              ""
          ).toLowerCase();

          const bName = String(
            b?.name ||
              b?.id ||
              ""
          ).toLowerCase();

          const aWhatsApp =
            aName.includes("whatsapp");

          const bWhatsApp =
            bName.includes("whatsapp");

          if (
            aWhatsApp &&
            !bWhatsApp
          ) {
            return -1;
          }

          if (
            !aWhatsApp &&
            bWhatsApp
          ) {
            return 1;
          }

          return aName.localeCompare(
            bName
          );
        });

        setServices(list);

        /*
         * US only.
         */
        await loadServicePrices(
          "a",
          list,
          "US"
        );
      } catch (err) {
        console.error(
          "LOAD SERVER 1 SERVICES ERROR:",
          err
        );

        setError(
          err?.message ||
            "Unable to load Server 1 services."
        );
      } finally {
        setLoadingServices(false);
      }
    }, [
      callBackend,
      loadServicePrices,
    ]);

  /*
   * =====================================================
   * LOAD SMSPOOL SERVICES
   * =====================================================
   */

  const loadSmsPoolServices =
    useCallback(async () => {
      try {
        setLoadingServices(true);
        setError("");

        const data = await callBackend({
          action: "services",
          serverId: "b",
        });

        const list = Array.isArray(
          data?.services
        )
          ? data.services
          : [];

        setServices(list);
        setPrices({});
      } catch (err) {
        console.error(
          "LOAD SERVER 2 SERVICES ERROR:",
          err
        );

        setError(
          err?.message ||
            "Unable to load Server 2 services."
        );
      } finally {
        setLoadingServices(false);
      }
    }, [callBackend]);

  /*
   * =====================================================
   * LOAD SMSPOOL COUNTRIES
   * =====================================================
   */

  const loadSmsPoolCountries =
    useCallback(async () => {
      try {
        setLoadingCountries(true);
        setError("");

        const data = await callBackend({
          action: "countries",
          serverId: "b",
        });

        const list = Array.isArray(
          data?.countries
        )
          ? data.countries
          : [];

        setCountries(list);

        setSelectedCountry(null);
      } catch (err) {
        console.error(
          "LOAD SERVER 2 COUNTRIES ERROR:",
          err
        );

        setError(
          err?.message ||
            "Unable to load countries."
        );
      } finally {
        setLoadingCountries(false);
      }
    }, [callBackend]);

  /*
   * =====================================================
   * SELECT SERVER
   * =====================================================
   */

  const selectServer = async (
    selected
  ) => {
    try {
      setShowServerMenu(false);

      setServer(selected);
      setError("");

      setServices([]);
      setCountries([]);

      setSelectedService(null);
      setSelectedCountry(null);

      setPrices({});
      setPurchasedNumber(null);
      setOtp("");
      setOtpMessage("");

      /*
       * SERVER 1
       */
      if (selected.id === "a") {
        const usCountry = {
          id: "US",
          providerId: "US",
          code: "US",
          name: "United States",
        };

        setSelectedCountry(
          usCountry
        );

        await loadFleexaServices();
      }

      /*
       * SERVER 2
       */
      if (selected.id === "b") {
        await loadSmsPoolCountries();

        await loadSmsPoolServices();
      }
    } catch (err) {
      console.error(
        "SELECT SERVER ERROR:",
        err
      );

      setError(
        err?.message ||
          "Unable to load this server."
      );
    }
  };

  /*
   * =====================================================
   * SELECT COUNTRY
   * =====================================================
   */

  const selectCountry = async (
    country
  ) => {
    setShowCountryMenu(false);

    setSelectedCountry(country);
    setSelectedService(null);
    setPrices({});
    setError("");

    if (
      server?.id === "b"
    ) {
      await loadServicePrices(
        "b",
        services,
        country?.providerId ||
          country?.id
      );
    }
  };

  /*
   * =====================================================
   * SELECT SERVICE
   * =====================================================
   */

  const selectService = (
    service
  ) => {
    setSelectedService(service);
    setError("");
  };

  /*
   * =====================================================
   * PURCHASE
   * =====================================================
   */

  const handleBuy = async () => {
    if (!server) {
      setError(
        "Please select a server first."
      );
      return;
    }

    if (!selectedService) {
      setError(
        "Please select a service first."
      );
      return;
    }

    if (
      server.id === "b" &&
      !selectedCountry
    ) {
      setError(
        "Please select a country first."
      );
      return;
    }

    const serviceId =
      selectedService.realId ||
      selectedService.id;

    const priceData =
      prices[serviceId];

    if (
      !priceData ||
      !priceData.customerPrice ||
      priceData.available === false
    ) {
      setError(
        "Live price is not available. Please refresh and try again."
      );
      return;
    }

    const price =
      Number(
        priceData.customerPrice
      );

    const countryId =
      server.id === "a"
        ? "US"
        : selectedCountry?.providerId ||
          selectedCountry?.id;

    const countryName =
      server.id === "a"
        ? "United States"
        : selectedCountry?.name ||
          selectedCountry?.id;

    const serviceName =
      selectedService.name ||
      selectedService.id;

    const confirmed =
      window.confirm(
        `Buy ${serviceName} for ${formatNaira(
          price
        )}?\n\n` +
          `Server: ${server.name}\n` +
          `Country: ${countryName}\n\n` +
          `This will purchase a real number.`
      );

    if (!confirmed) {
      return;
    }

    try {
      setBuying(true);
      setError("");

      const user =
        await base44.auth.me();

      if (!user?.email) {
        throw new Error(
          "Please log in again."
        );
      }

      const result =
        await callBackend({
          action: "order",
          serverId:
            server.id,
          service:
            serviceId,
          realId:
            serviceId,
          country:
            countryId,
          countryProviderId:
            countryId,
          countryName,
          userEmail:
            user.email,
        });

      if (!result?.success) {
        throw new Error(
          result?.error ||
            "The provider rejected the purchase."
        );
      }

      if (!result?.phone) {
        throw new Error(
          "The purchase succeeded but no phone number was returned."
        );
      }

      setPurchasedNumber({
        phone: result.phone,
        orderId:
          result.orderId,
        rentalId:
          result.rentalId,
        service:
          serviceName,
        serviceId,
        country:
          countryName,
        server:
          server.name,
        price:
          Number(
            result.charged ||
              price
          ),
      });

      setOtp("");
      setOtpMessage("");

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (err) {
      console.error(
        "PURCHASE ERROR:",
        err
      );

      setError(
        err?.message ||
          "Unable to purchase the number."
      );
    } finally {
      setBuying(false);
    }
  };

  /*
   * =====================================================
   * CHECK OTP
   * =====================================================
   */

  const checkOtp = async () => {
    if (!purchasedNumber) {
      return;
    }

    if (
      !purchasedNumber.orderId
    ) {
      setOtpMessage(
        "No provider order ID is available."
      );
      return;
    }

    try {
      setCheckingOtp(true);
      setOtpMessage("");

      const result =
        await callBackend({
          action: "checkOtp",
          serverId:
            server?.id,
          orderId:
            purchasedNumber.orderId,
          requestId:
            purchasedNumber.orderId,
        });

      const code =
        result?.code || "";

      if (code) {
        setOtp(code);

        setOtpMessage(
          "OTP received successfully."
        );
      } else {
        setOtpMessage(
          result?.status
            ? `Status: ${result.status}. No OTP yet.`
            : "No OTP has arrived yet."
        );
      }
    } catch (err) {
      console.error(
        "CHECK OTP ERROR:",
        err
      );

      setOtpMessage(
        err?.message ||
          "Unable to check OTP."
      );
    } finally {
      setCheckingOtp(false);
    }
  };

  /*
   * =====================================================
   * COPY NUMBER
   * =====================================================
   */

  const copyNumber = async () => {
    if (!purchasedNumber?.phone) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        purchasedNumber.phone
      );

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 1500);
    } catch {
      setError(
        "Unable to copy number."
      );
    }
  };

  /*
   * =====================================================
   * BACK TO SERVERS
   * =====================================================
   */

  const backToServers = () => {
    setServer(null);
    setServices([]);
    setCountries([]);
    setSelectedService(null);
    setSelectedCountry(null);
    setPrices({});
    setPurchasedNumber(null);
    setOtp("");
    setOtpMessage("");
    setError("");
  };

  /*
   * =====================================================
   * REFRESH CURRENT SERVER
   * =====================================================
   */

  const refreshCurrentServer =
    async () => {
      if (!server) {
        await loadServers();
        return;
      }

      setError("");

      if (server.id === "a") {
        await loadFleexaServices();
      }

      if (server.id === "b") {
        await loadSmsPoolCountries();
        await loadSmsPoolServices();
      }
    };

  /*
   * =====================================================
   * UI
   * =====================================================
   */

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* HEADER */}

      <div className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">

          <div className="flex items-center gap-3">

            {server && (
              <button
                type="button"
                onClick={backToServers}
                className="rounded-xl p-2 hover:bg-slate-100"
              >
                <ArrowLeft size={20} />
              </button>
            )}

            <div>
              <h1 className="text-xl font-bold">
                Virtual Numbers
              </h1>

              <p className="text-xs text-slate-500">
                Real numbers and OTP services
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={refreshCurrentServer}
            disabled={
              loading ||
              loadingServices ||
        

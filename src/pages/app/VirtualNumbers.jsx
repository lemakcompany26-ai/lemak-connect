import { useCallback, useEffect, useMemo, useState } from "react";
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
  Timer,
  X,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { formatNaira } from "@/lib/utils";

export default function VirtualNumbers() {
  const [servers, setServers] = useState([]);
  const [selectedServer, setSelectedServer] = useState(null);
  const [catalog, setCatalog] = useState(null);

  const [country, setCountry] = useState("US");
  const [countryName, setCountryName] = useState("United States");
  const [countryProviderId, setCountryProviderId] = useState("US");

  const [tab, setTab] = useState("sms");
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [buying, setBuying] = useState(null);

  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [purchasedNumber, setPurchasedNumber] = useState(null);

  const [otp, setOtp] = useState(null);
  const [checkingOtp, setCheckingOtp] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const [timeLeft, setTimeLeft] = useState(420);

  const loadCatalog = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const res = await base44.functions.invoke("virtualNumbers", {
        action: "catalog",
      });

      const data = res?.data || res;

      if (!data?.success) {
        throw new Error(data?.error || "Unable to load virtual-number servers.");
      }

      const list = Array.isArray(data.servers) ? data.servers : [];

      setServers(list);

      if (!selectedServer && list.length) {
        setSelectedServer(list[0]);
      }
    } catch (err) {
      setError(err?.message || "Unable to load virtual-number servers.");
    } finally {
      setLoading(false);
    }
  }, [selectedServer]);

  const loadServerData = useCallback(async () => {
    if (!selectedServer?.id) return;

    try {
      setLoading(true);
      setError("");
      setPrices({});
      setCatalog(null);

      const serviceRes = await base44.functions.invoke("virtualNumbers", {
        action: "services",
        serverId: selectedServer.id,
      });

      const serviceData = serviceRes?.data || serviceRes;

      if (!serviceData?.success) {
        throw new Error(
          serviceData?.error || "Unable to load available services."
        );
      }

      const serviceList = Array.isArray(serviceData.services)
        ? serviceData.services
        : [];

      let countries = [];

      const countryRes = await base44.functions.invoke("virtualNumbers", {
        action: "countries",
        serverId: selectedServer.id,
      });

      const countryData = countryRes?.data || countryRes;

      if (countryData?.success && Array.isArray(countryData.countries)) {
        countries = countryData.countries;
      }

      setCatalog({
        services: serviceList,
        countries,
      });

      if (selectedServer.id === "a") {
        const us =
          countries.find(
            (x) =>
              String(x.id || "").toUpperCase() === "US" ||
              String(x.providerId || "").toUpperCase() === "US"
          ) || {
            id: "US",
            providerId: "US",
            name: "United States",
            code: "US",
          };

        setCountry(us.id || "US");
        setCountryProviderId(us.providerId || us.id || "US");
        setCountryName(us.name || "United States");
      } else if (countries.length) {
        const first = countries[0];

        setCountry(first.id || first.providerId || "");
        setCountryProviderId(
          first.providerId || first.id || first.code || ""
        );
        setCountryName(first.name || first.country || first.title || "");
      } else {
        setCountry("");
        setCountryProviderId("");
        setCountryName("");
      }
    } catch (err) {
      setError(err?.message || "Unable to load virtual-number services.");
      setCatalog({ services: [], countries: [] });
    } finally {
      setLoading(false);
    }
  }, [selectedServer]);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    if (selectedServer) {
      loadServerData();
    }
  }, [selectedServer, loadServerData]);

  const services = useMemo(() => {
    const list = Array.isArray(catalog?.services) ? catalog.services : [];

    const filtered = list.filter((item) => {
      const text = `${item.name || ""} ${item.id || ""}`.toLowerCase();
      return text.includes(search.toLowerCase());
    });

    return filtered;
  }, [catalog, search]);

  const countries = useMemo(() => {
    return Array.isArray(catalog?.countries) ? catalog.countries : [];
  }, [catalog]);

  const loadPrice = useCallback(
    async (item) => {
      if (!selectedServer?.id || !item?.id) return;

      try {
        setLoadingPrices(true);

        const res = await base44.functions.invoke("virtualNumbers", {
          action: "price",
          serverId: selectedServer.id,
          service: item.id,
          realId: item.realId || item.id,
          country,
          countryProviderId,
        });

        const data = res?.data || res;

        if (!data?.success) {
          throw new Error(data?.error || "Price unavailable.");
        }

        setPrices((old) => ({
          ...old,
          [item.id]: data,
        }));
      } catch (err) {
        setPrices((old) => ({
          ...old,
          [item.id]: {
            error: err?.message || "Price unavailable.",
          },
        }));
      } finally {
        setLoadingPrices(false);
      }
    },
    [selectedServer, country, countryProviderId]
  );

  useEffect(() => {
    if (!services.length || !selectedServer) return;

    let cancelled = false;

    const loadAllPrices = async () => {
      setLoadingPrices(true);

      for (const item of services) {
        if (cancelled) break;

        try {
          const res = await base44.functions.invoke("virtualNumbers", {
            action: "price",
            serverId: selectedServer.id,
            service: item.id,
            realId: item.realId || item.id,
            country,
            countryProviderId,
          });

          const data = res?.data || res;

          if (!cancelled) {
            setPrices((old) => ({
              ...old,
              [item.id]: data?.success
                ? data
                : { error: data?.error || "Price unavailable." },
            }));
          }
        } catch (err) {
          if (!cancelled) {
            setPrices((old) => ({
              ...old,
              [item.id]: {
                error: err?.message || "Price unavailable.",
              },
            }));
          }
        }
      }

      if (!cancelled) setLoadingPrices(false);
    };

    loadAllPrices();

    return () => {
      cancelled = true;
    };
  }, [services, selectedServer, country, countryProviderId]);

  const handleCountryChange = (e) => {
    const value = e.target.value;
    const selected =
      countries.find(
        (item) =>
          String(item.id) === String(value) ||
          String(item.providerId) === String(value)
      ) || null;

    setCountry(value);
    setCountryProviderId(
      selected?.providerId || selected?.id || selected?.code || value
    );
    setCountryName(
      selected?.name ||
        selected?.country ||
        selected?.title ||
        value
    );
    setPrices({});
  };

  const handleServerChange = (server) => {
    setSelectedServer(server);
    setSearch("");
    setPrices({});
    setPurchasedNumber(null);
    setOtp(null);
    setTab("sms");
  };

  const handleBuy = async (item) => {
    if (!catalog) return;

    const priceData = prices[item.id];

    if (!priceData?.customerPrice) {
      alert(
        "The live provider price has not loaded yet. Please wait a moment and try again."
      );
      return;
    }

    const priceValue = Number(priceData.customerPrice);

    if (!Number.isFinite(priceValue) || priceValue <= 0) {
      alert("The live price for this service is unavailable.");
      return;
    }

    if (!country) {
      alert("Please select a country first.");
      return;
    }

    const confirmed = window.confirm(
      `Buy ${item.name || item.id} for ${formatNaira(priceValue)}?`
    );

    if (!confirmed) return;

    try {
      setBuying(item.id);
      setError("");
      setOtp(null);

      const user = await base44.auth.me();

      if (!user?.email) {
        throw new Error("Please log in before buying a virtual number.");
      }

      const res = await base44.functions.invoke("virtualNumbers", {
        action: "order",
        serverId: selectedServer.id,
        service: item.id,
        realId: item.realId || item.id,
        country,
        countryName,
        countryProviderId,
        price: priceValue,
        userEmail: user.email,
      });

      const data = res?.data || res;

      if (!data?.success) {
        throw new Error(data?.error || "Unable to purchase this number.");
      }

      if (!data?.phone) {
        throw new Error(
          "The provider completed the order but did not return a phone number."
        );
      }

      const purchase = {
        phone: data.phone,
        orderId: data.orderId || data.requestId,
        requestId: data.requestId || data.orderId,
        rentalId: data.rentalId,
        charged: data.charged ?? priceValue,
        customerPrice: data.customerPrice ?? priceValue,
        providerPrice: data.providerPrice,
        currency: data.currency || "NGN",
        service: item.name || item.id,
        serviceId: item.id,
        country: data.country || country,
        countryName: data.countryName || countryName,
        status: data.status || "waiting_sms",
        serverId: selectedServer.id,
      };

      setPurchasedNumber(purchase);
      setOtp(null);
      setTimeLeft(420);

      alert(
        `Virtual number purchased successfully.\n\nNumber: ${purchase.phone}\nOrder ID: ${purchase.orderId}`
      );
    } catch (err) {
      const message =
        err?.response?.data?.error ||
        err?.message ||
        "Unable to purchase virtual number.";

      setError(message);
      alert(message);
    } finally {
      setBuying(null);
    }
  };

  const checkOtp = useCallback(async () => {
    if (!purchasedNumber?.orderId && !purchasedNumber?.requestId) return;

    try {
      setCheckingOtp(true);
      setError("");

      const res = await base44.functions.invoke("virtualNumbers", {
        action: "checkOtp",
        serverId: purchasedNumber.serverId || selectedServer?.id,
        orderId: purchasedNumber.orderId,
        requestId: purchasedNumber.requestId || purchasedNumber.orderId,
      });

      const data = res?.data || res;

      if (!data?.success) {
        throw new Error(data?.error || "Unable to check OTP.");
      }

      setOtp({
        status: data.status,
        code: data.code || "",
        smsText: data.smsText || data.sms || "",
        phone: data.phone || purchasedNumber.phone,
      });

      if (data.code) {
        setTimeLeft(0);
      }
    } catch (err) {
      setError(err?.message || "Unable to check OTP.");
    } finally {
      setCheckingOtp(false);
    }
  }, [purchasedNumber, selectedServer]);

  const cancelOrder = async () => {
    if (!purchasedNumber?.orderId && !purchasedNumber?.requestId) return;

    const confirmed = window.confirm(
      "Cancel this virtual number and request a refund if the provider allows it?"
    );

    if (!confirmed) return;

    try {
      setCancelling(true);
      setError("");

      const res = await base44.functions.invoke("virtualNumbers", {
        action: "cancel",
        serverId: purchasedNumber.serverId || selectedServer?.id,
        orderId: purchasedNumber.orderId,
        requestId: purchasedNumber.requestId || purchasedNumber.orderId,
      });

      const data = res?.data || res;

      if (!data?.success) {
        throw new Error(data?.error || "Unable to cancel this order.");
      }

      setPurchasedNumber(null);
      setOtp(null);
      setTimeLeft(420);

      alert(data?.message || "Virtual-number order cancelled.");
    } catch (err) {
      const message = err?.message || "Unable to cancel this order.";
      setError(message);
      alert(message);
    } finally {
      setCancelling(false);
    }
  };

  useEffect(() => {
    if (!purchasedNumber || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((value) => {
        if (value <= 1) {
          clearInterval(timer);
          return 0;
        }

        return value - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [purchasedNumber, timeLeft]);

  useEffect(() => {
    if (!purchasedNumber || timeLeft <= 0) return;

    const interval = setInterval(() => {
      checkOtp();
    }, 10000);

    return () => clearInterval(interval);
  }, [purchasedNumber, timeLeft, checkOtp]);

  const formatTimer = (seconds) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;

    return `${String(min).padStart(2, "0")}:${String(sec).padStart(
      2,
      "0"
    )}`;
  };

  const copyNumber = async () => {
    if (!purchasedNumber?.phone) return;

    try {
      await navigator.clipboard.writeText(purchasedNumber.phone);
      alert("Phone number copied.");
    } catch {
      alert(purchasedNumber.phone);
    }
  };

  if (loading && !catalog && !servers.length) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm text-muted-foreground">
            Loading virtual numbers...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6">
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={() => window.history.back()}
            className="flex h-10 w-10 items-center justify-center rounded-xl border bg-card hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div>
            <h1 className="text-xl font-bold">Virtual Numbers</h1>
            <p className="text-sm text-muted-foreground">
              Rent real numbers for SMS and OTP verification
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <X className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="flex-1">{error}</div>

            <button
              onClick={() => setError("")}
              className="rounded-md p-1 hover:bg-red-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="mb-6">
          <h2 className="mb-3 text-sm font-semibold">Choose Server</h2>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {servers.map((server) => {
              const active = selectedServer?.id === server.id;

              return (
                <button
                  key={server.id}
                  onClick={() => handleServerChange(server)}
                  className={`rounded-2xl border p-4 text-left transition ${
                    active
                      ? "border-blue-600 bg-blue-50 ring-2 ring-blue-100"
                      : "bg-card hover:border-blue-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                          active
                            ? "bg-blue-600 text-white"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <Server className="h-5 w-5" />
                      </div>

                      <div>
                        <div className="font-semibold">
                          {server.name || `Server ${server.id}`}
                        </div>

                        <div

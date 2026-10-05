import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import YellowOtpChat from "@/components/vnum/YellowOtpChat";
import NumberServiceList from "@/components/vnum/NumberServiceList";

const money = (n) =>
  `₦${Number(n || 0).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
  })}`;

const getErr = (e) =>
  e?.response?.data?.error ||
  e?.response?.data?.message ||
  e?.message ||
  "Request failed.";

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export default function VirtualNumbers() {
  const [server, setServer] = useState("a");
  const [servers, setServers] = useState([]);
  const [services, setServices] = useState([]);
  const [countries, setCountries] = useState([]);
  const [country, setCountry] = useState("");
  const [prices, setPrices] = useState({});
  const [active, setActive] = useState(null);
  const [otp, setOtp] = useState(null);

  const [loading, setLoading] = useState(true);
  const [loadingServices, setLoadingServices] = useState(false);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [buying, setBuying] = useState(false);
  const [checkingOtp, setCheckingOtp] = useState(false);

  const [error, setError] = useState("");

  const mountedRef = useRef(true);
  const priceRequestRef = useRef(0);

  const call = useCallback(async (params) => {
    const response = await base44.functions.invoke(
      "virtualNumbers",
      params
    );

    const data = response?.data || response;

    if (!data?.success) {
      throw new Error(
        data?.error ||
          data?.message ||
          "Request failed."
      );
    }

    return data;
  }, []);

  /*
   * Load server catalog.
   */
  useEffect(() => {
    mountedRef.current = true;

    const start = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await call({
          action: "catalog",
        });

        if (!mountedRef.current) return;

        const list = Array.isArray(data?.servers)
          ? data.servers
          : [];

        setServers(list);

        const available =
          list.find((item) => item?.available) ||
          list[0];

        const firstServer =
          available?.id || "a";

        setServer(firstServer);
      } catch (e) {
        if (mountedRef.current) {
          setError(getErr(e));
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    };

    start();

    return () => {
      mountedRef.current = false;
    };
  }, [call]);

  /*
   * Load services + countries whenever server changes.
   */
  const loadServerData = useCallback(
    async (serverId) => {
      try {
        setLoadingServices(true);
        setError("");

        setServices([]);
        setCountries([]);
        setPrices({});
        setCountry("");

        const [servicesResult, countriesResult] =
          await Promise.all([
            call({
              action: "services",
              serverId,
            }),
            call({
              action: "countries",
              serverId,
            }),
          ]);

        if (!mountedRef.current) return;

        const serviceList = Array.isArray(
          servicesResult?.services
        )
          ? servicesResult.services
          : [];

        const countryList = Array.isArray(
          countriesResult?.countries
        )
          ? countriesResult.countries
          : [];

        setServices(serviceList);
        setCountries(countryList);

        /*
         * Server A = US.
         * Server B = first real provider country.
         *
         * Never invent a fake/default country.
         */
        if (serverId === "a") {
          setCountry("US");
        } else {
          const firstRealCountry =
            countryList.find(
              (item) =>
                item?.providerId ||
                item?.id ||
                item?.code
            );

          setCountry(
            firstRealCountry?.providerId ||
              firstRealCountry?.id ||
              firstRealCountry?.code ||
              ""
          );
        }
      } catch (e) {
        if (mountedRef.current) {
          setError(getErr(e));
        }
      } finally {
        if (mountedRef.current) {
          setLoadingServices(false);
        }
      }
    },
    [call]
  );

  useEffect(() => {
    if (!loading && server) {
      loadServerData(server);
    }
  }, [server, loading, loadServerData]);

  /*
   * Load live prices.
   *
   * Uses a request ID so prices from an old
   * server/country selection cannot overwrite
   * prices belonging to the new selection.
   */
  useEffect(() => {
    if (!services.length) return;

    if (server === "b" && !country) {
      setPrices({});
      return;
    }

    const requestId = ++priceRequestRef.current;
    let cancelled = false;

    const loadPrices = async () => {
      setLoadingPrices(true);

      const nextPrices = {};

      for (const item of services) {
        if (cancelled) return;

        const serviceId =
          item?.realId ||
          item?.providerId ||
          item?.id;

        if (!serviceId) continue;

        try {
          const data = await call({
            action: "price",
            serverId: server,
            service: serviceId,
            country,
          });

          if (
            cancelled ||
            requestId !== priceRequestRef.current
          ) {
            return;
          }

          nextPrices[item.id] = data;
          setPrices((old) => ({
            ...old,
            [item.id]: data,
          }));
        } catch (e) {
          if (
            cancelled ||
            requestId !== priceRequestRef.current
          ) {
            return;
          }

          nextPrices[item.id] = {
            error: getErr(e),
          };

          setPrices((old) => ({
            ...old,
            [item.id]: {
              error: getErr(e),
            },
          }));
        }
      }

      if (
        !cancelled &&
        requestId === priceRequestRef.current
      ) {
        setLoadingPrices(false);
      }
    };

    loadPrices();

    return () => {
      cancelled = true;
    };
  }, [services, country, server, call]);

  /*
   * Change server.
   */
  const changeServer = async (serverId) => {
    if (serverId === server) return;

    setServer(serverId);

    setActive(null);
    setOtp(null);
    setError("");
    setPrices({});
    setServices([]);
    setCountries([]);
    setCountry("");
  };

  /*
   * Buy number.
   */
  const buy = async (item) => {
    const priceData = prices[item.id];

    const livePrice = Number(
      priceData?.customerPrice
    );

    if (
      !priceData ||
      !Number.isFinite(livePrice) ||
      livePrice <= 0
    ) {
      setError(
        "The live provider price has not loaded yet. Please wait a moment and try again."
      );
      return;
    }

    if (server === "b" && !country) {
      setError("Please select a country first.");
      return;
    }

    const confirmed = window.confirm(
      `Buy ${
        item.name || "this number"
      } for ${money(livePrice)}?`
    );

    if (!confirmed) return;

    try {
      setBuying(true);
      setError("");

      const user = await base44.auth.me();

      if (!user?.email) {
        throw new Error(
          "Please log in before buying a virtual number."
        );
      }

      const selectedCountry = countries.find(
        (c) =>
          String(
            c?.providerId ||
              c?.id ||
              c?.code ||
              ""
          ) === String(country)
      );

      const serviceId =
        item?.realId ||
        item?.providerId ||
        item?.id;

      const data = await call({
        action: "order",
        serverId: server,
        userEmail: user.email,

        service: serviceId,
        realId: serviceId,

        country,
        countryName:
          server === "a"
            ? "United States"
            : selectedCountry?.name ||
              selectedCountry?.code ||
              country,

        countryProviderId:
          selectedCountry?.providerId ||
          selectedCountry?.id ||
          selectedCountry?.code ||
          country,

        price: livePrice,
      });

      if (!data?.orderId) {
        throw new Error(
          "The provider did not return an order ID."
        );
      }

      const newActive = {
        ...data,

        serverId:
          data.serverId || server,

        orderId: data.orderId,

        requestId:
          data.requestId ||
          data.id ||
          data.orderId,

        phone:
          data.phone ||
          data.number ||
          "Number pending",

        serviceName:
          item.name ||
          data.serviceName ||
          "Virtual Number",

        price: livePrice,

        countryName:
          server === "a"
            ? "United States"
            : selectedCountry?.name ||
              selectedCountry?.code ||
              country,
      };

      setActive(newActive);
      setOtp(null);

      /*
       * Give the provider a moment to register the
       * number before the first OTP check.
       */
      await sleep(700);

      if (mountedRef.current) {
        try {
          const otpData = await call({
            action: "checkOtp",
            serverId:
              newActive.serverId || server,
            orderId: newActive.orderId,
            requestId: newActive.requestId,
          });

          if (mountedRef.current) {
            setOtp(otpData);
          }
        } catch {
          /*
           * It is normal for OTP to not exist immediately.
           */
        }
      }
    } catch (e) {
      if (mountedRef.current) {
        setError(getErr(e));
      }
    } finally {
      if (mountedRef.current) {
        setBuying(false);
      }
    }
  };

  /*
   * Check OTP.
   */
  const check = useCallback(
    async (silent = false) => {
      if (!active?.orderId) return;

      if (!silent) {
        setCheckingOtp(true);
        setError("");
      }

      try {
        const data = await call({
          action: "checkOtp",
          serverId:
            active.serverId || server,
          orderId: active.orderId,
          requestId:
            active.requestId ||
            active.orderId,
        });

        if (mountedRef.current) {
          setOtp(data);
        }

        return data;
      } catch (e) {
        /*
         * Don't show noisy errors for automatic checks.
         */
        if (!silent && mountedRef.current) {
          setError(getErr(e));
        }
      } finally {
        if (!silent && mountedRef.current) {
          setCheckingOtp(false);
        }
      }
    },
    [active, server, call]
  );

  /*
   * Automatic OTP polling.
   */
  useEffect(() => {
    if (!active?.orderId) return;

    let stopped = false;

    const poll = async () => {
      if (stopped) return;

      await check(true);

      if (stopped) return;

      /*
       * Poll every 8 seconds.
       */
    };

    poll();

    const timer = setInterval(
      poll,
      8000
    );

    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [active?.orderId, check]);

  /*
   * Cancel + refund.
   */
  const cancel = async () => {
    if (!active?.orderId) return;

    const confirmed = window.confirm(
      "Cancel this number and request a wallet refund?"
    );

    if (!confirmed) return;

    try {
      setBuying(true);
      setError("");

      const data = await call({
        action: "cancel",
        serverId:
          active.serverId || server,
        orderId: active.orderId,
        requestId:
          active.requestId ||
          active.orderId,
      });

      alert(
        data?.message ||
          "Number cancelled successfully."
      );

      setActive(null);
      setOtp(null);
    } catch (e) {
      setError(getErr(e));
    } finally {
      setBuying(false);
    }
  };

  const copyNumber = async () => {
    if (!active?.phone) return;

    try {
      await navigator.clipboard.writeText(
        active.phone
      );
      alert("Number copied.");
    } catch {
      setError(
        "Unable to copy the number."
      );
    }
  };

  /*
   * Extract OTP/code from different provider
   * response formats.
   */
  const otpCode =
    otp?.code ||
    otp?.otp ||
    otp?.smsCode ||
    otp?.verificationCode ||
    "";

  const smsText =
    otp?.smsText ||
    otp?.sms ||
    otp?.message ||
    otp?.text ||
    "";

  const hasOtp =
    Boolean(otpCode) ||
    Boolean(smsText);

  /*
   * Initial loading.
   */
  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-10">
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto animate-spin" />
          <p className="mt-3 text-sm text-muted-foreground">
            Loading virtual numbers...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 pb-12">
      {/* HEADER */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold">
          Virtual Numbers
        </h1>

        <p className="text-sm text-muted-foreground mt-1">
          Buy a number and receive your OTP in
          real time.
        </p>
      </div>

      {/* ERROR */}
      {error && (
        <div className="mb-5 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* SERVER SELECTION */}
      {servers.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          {servers.map((item) => {
            const selected =
              server === item.id;

            return (
              <button
                key={item.id}
                type="button"
                disabled={!item.available}
                onClick={() =>
                  changeServer(item.id)
                }
                className={`text-left p-4 rounded-2xl border-2 transition ${
                  selected
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                } ${
                  !item.available
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold">
                      {item.name ||
                        `Server ${item.id}`}
                    </div>

                    <div className="text-xs text-muted-foreground mt-1">
                      {item.available
                        ? "Available"
                        : "Not configured"}
                    </div>
                  </div>

                  {selected && (
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* COUNTRY */}
      {server === "b" && (
        <div className="mb-5">
          <label className="block text-sm font-medium mb-2">
            Select country
          </label>

          <select
            value={country}
            onChange={(e) => {
              setCountry(e.target.value);
              setPrices({});
              setError("");
            }}
            className="w-full border rounded-2xl p-3 bg-background"
          >
            <option value="">
              Select country
            </option>

            {countries.map((item) => {
              const id =
                item?.providerId ||
                item?.id ||
                item?.code;

              if (!id) return null;

              return (
                <option
                  key={id}
                  value={id}
                >
                  {item?.name ||
                    item?.code ||
                    id}
                </option>
              );
            })}
          </select>
        </div>
      )}

      {/* ACTIVE OTP CHAT */}
      <YellowOtpChat
        active={active}
        otpCode={otpCode}
        smsText={smsText}
        checking={checkingOtp}
        cancelling={buying}
        onCopy={copyNumber}
        onCheck={() => check(false)}
        onCancel={cancel}
        onClose={() => {
          setActive(null);
          setOtp(null);
        }}
      />

      {/* SERVICES */}
      {loadingServices ? (
        <div className="py-10 text-center">
          <Loader2 className="mx-auto animate-spin" />
          <p className="mt-2 text-sm text-muted-foreground">
            Loading services...
          </p>
        </div>
      ) : (
        <NumberServiceList
          services={services}
          prices={prices}
          loadingPrices={loadingPrices}
          buying={buying}
          onBuy={buy}
        />
      )}
    </div>
  );
}
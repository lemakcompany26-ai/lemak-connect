import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";

import { base44 } from "@/api/base44Client";

import {
  ArrowLeft,
  Check,
  ChevronDown,
  CircleDollarSign,
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
  X
} from "lucide-react";

import { Button } from "@/components/ui/button";

import PurchasedNumberCard from "@/components/vnum/PurchasedNumberCard";
import ServiceOptions from "@/components/vnum/ServiceOptions";

export default function VirtualNumbers() {
  const [server, setServer] = useState(null);

  const [services, setServices] = useState([]);
  const [countries, setCountries] = useState([]);

  const [selectedService, setSelectedService] =
    useState(null);

  const [selectedCountry, setSelectedCountry] =
    useState(null);

  const [prices, setPrices] = useState({});

  const [loading, setLoading] = useState(false);
  const [loadingServices, setLoadingServices] =
    useState(false);
  const [loadingCountries, setLoadingCountries] =
    useState(false);
  const [loadingPrices, setLoadingPrices] =
    useState(false);

  const [buying, setBuying] = useState(false);

  const [error, setError] = useState("");

  const [purchasedNumber, setPurchasedNumber] =
    useState(null);

  const [otp, setOtp] = useState("");
  const [otpMessage, setOtpMessage] =
    useState("");
  const [checkingOtp, setCheckingOtp] =
    useState(false);

  const [showServerMenu, setShowServerMenu] =
    useState(false);

  const [showCountryMenu, setShowCountryMenu] =
    useState(false);

  const [copied, setCopied] =
    useState(false);

  const formatNaira = (amount) => {
    const value = Number(amount || 0);

    return `₦${value.toLocaleString("en-NG", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    })}`;
  };

  const callBackend = useCallback(
  async (payload) => {
    console.log(
      "VIRTUAL NUMBERS REQUEST:",
      payload
    );

    try {
      const result =
        await base44.functions.invoke(
          "virtualNumbers",
          payload
        );

      console.log(
        "VIRTUAL NUMBERS RAW RESPONSE:",
        result
      );

      const data =
        result?.data ?? result;

      console.log(
        "VIRTUAL NUMBERS RESPONSE DATA:",
        data
      );

      if (!data) {
        throw new Error(
          "Virtual-number server returned no response."
        );
      }

      if (data.success === false) {
        throw new Error(
          data.error ||
            data.message ||
            `Virtual-number request failed for action: ${
              payload?.action || "unknown"
            }`
        );
      }

      return data;
    } catch (error) {
      console.error(
        "VIRTUAL NUMBERS FUNCTION ERROR:",
        {
          payload,
          error,
          response: error?.response,
          responseData:
            error?.response?.data,
          data: error?.data,
          message: error?.message
        }
      );

      const backendMessage =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.data?.error ||
        error?.data?.message ||
        error?.message;

      throw new Error(
        backendMessage ||
          `Virtual-number request failed for action: ${
            payload?.action || "unknown"
          }`
      );
    }
  },
  []
);

  /*
   * -------------------------------------------------------
   * LOAD SERVERS
   * -------------------------------------------------------
   */

  const loadServers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data =
        await callBackend({
          action: "catalog"
        });

      if (
        !Array.isArray(data.servers)
      ) {
        throw new Error(
          "No virtual-number servers were returned."
        );
      }

      /*
       * Do not automatically purchase or select
       * anything. The user chooses the server.
       */
      setServer(null);
      setServices([]);
      setCountries([]);
      setSelectedService(null);
      setSelectedCountry(null);
      setPrices({});
    } catch (err) {
      console.error(
        "LOAD VIRTUAL NUMBER SERVERS ERROR:",
        err
      );

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
   * -------------------------------------------------------
   * SERVER DEFINITIONS
   * -------------------------------------------------------
   */

  const serverOptions = useMemo(
    () => [
      {
        id: "a",
        name: "Server 1",
        provider: "Fleexa",
        description:
          "US numbers • SMS OTP • Email OTP • Rentals",
        country: "United States",
        icon: Smartphone
      },
      {
        id: "b",
        name: "Server 2",
        provider: "SMSPool",
        description:
          "International SMS OTP numbers",
        country: "Multiple countries",
        icon: Globe2
      }
    ],
    []
  );

  /*
   * -------------------------------------------------------
   * SELECT SERVER
   * -------------------------------------------------------
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

      if (selected.id === "a") {
        /*
         * Server 1 is US-only.
         */
        setSelectedCountry({
          id: "US",
          providerId: "US",
          code: "US",
          name: "United States"
        });

        await loadFleexaServices();
      }

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
   * -------------------------------------------------------
   * LOAD FLEEXA SERVICES
   * -------------------------------------------------------
   */

  const loadFleexaServices =
    useCallback(async () => {
      try {
        setLoadingServices(true);
        setError("");

        const data =
          await callBackend({
            action: "services",
            serverId: "a"
          });

        let list =
          Array.isArray(data.services)
            ? data.services
            : [];

        /*
         * WhatsApp MUST appear first.
         */
        list = [...list].sort(
          (a, b) => {
            const aWhatsApp =
              String(
                a?.name ||
                  a?.id ||
                  ""
              )
                .toLowerCase()
                .includes("whatsapp");

            const bWhatsApp =
              String(
                b?.name ||
                  b?.id ||
                  ""
              )
                .toLowerCase()
                .includes("whatsapp");

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

            return String(
              a?.name || a?.id || ""
            ).localeCompare(
              String(
                b?.name ||
                  b?.id ||
                  ""
              )
            );
          }
        );

        setServices(list);

        /*
         * Load live prices for every returned service.
         */
        await loadServicePrices(
          "a",
          list,
          "US"
        );
      } catch (err) {
        console.error(
          "LOAD FLEEXA SERVICES ERROR:",
          err
        );

        setError(
          err?.message ||
            "Unable to load Fleexa services."
        );
      } finally {
        setLoadingServices(false);
      }
    }, [callBackend]);

  /*
   * -------------------------------------------------------
   * LOAD SMSPOOL SERVICES
   * -------------------------------------------------------
   */

  const loadSmsPoolServices =
    useCallback(async () => {
      try {
        setLoadingServices(true);
        setError("");

        const data =
          await callBackend({
            action: "services",
            serverId: "b"
          });

        const list =
          Array.isArray(data.services)
            ? data.services
            : [];

        setServices(list);

        /*
         * Price will load after country is selected.
         */
        setPrices({});
      } catch (err) {
        console.error(
          "LOAD SMSPOOL SERVICES ERROR:",
          err
        );

        setError(
          err?.message ||
            "Unable to load SMSPool services."
        );
      } finally {
        setLoadingServices(false);
      }
    }, [callBackend]);

  /*
   * -------------------------------------------------------
   * LOAD SMSPOOL COUNTRIES
   * -------------------------------------------------------
   */

  const loadSmsPoolCountries =
    useCallback(async () => {
      try {
        setLoadingCountries(true);
        setError("");

        const data =
          await callBackend({
            action: "countries",
            serverId: "b"
          });

        const list =
          Array.isArray(data.countries)
            ? data.countries
            : [];

        setCountries(list);

        /*
         * Do not select a fake/default country.
         * User must choose an actual provider country.
         */
        setSelectedCountry(null);
      } catch (err) {
        console.error(
          "LOAD SMSPOOL COUNTRIES ERROR:",
          err
        );

        setError(
          err?.message ||
            "Unable to load SMSPool countries."
        );
      } finally {
        setLoadingCountries(false);
      }
    }, [callBackend]);

  /*
   * -------------------------------------------------------
   * LOAD LIVE PRICES
   * -------------------------------------------------------
   */

  const loadServicePrices =
    useCallback(
      async (
        serverId,
        serviceList,
        countryId
      ) => {
        if (
          !Array.isArray(serviceList) ||
          serviceList.length === 0
        ) {
          return;
        }

        try {
          setLoadingPrices(true);

          const nextPrices = {};

          /*
           * Keep requests controlled so a large
           * provider catalog does not hammer the API.
           */
          for (
            const item of serviceList
          ) {
            const serviceId =
              item?.realId ||
              item?.id;

            if (!serviceId) {
              continue;
            }

            try {
              const data =
                await callBackend({
                  action: "price",
                  serverId,
                  service:
                    serviceId,
                  realId:
                    serviceId,
                  country:
                    countryId || "US",
                  countryProviderId:
                    countryId || "US"
                });

              if (
                data?.customerPrice
              ) {
                nextPrices[
                  serviceId
                ] = {
                  providerPrice:
                    Number(
                      data.providerPrice ||
                        0
                    ),
                  customerPrice:
                    Number(
                      data.customerPrice ||
                        0
                    ),
                  currency:
                    data.currency ||
                    "NGN",
                  available:
                    data.available !==
                    false
                };
              } else {
                nextPrices[
                  serviceId
                ] = {
                  providerPrice: 0,
                  customerPrice: 0,
                  available: false
                };
              }
            } catch (priceError) {
              console.warn(
                "PRICE LOAD FAILED:",
                serviceId,
                priceError
              );

              nextPrices[
                serviceId
              ] = {
                providerPrice: 0,
                customerPrice: 0,
                available: false
              };
            }
          }

          setPrices(
            nextPrices
          );
        } finally {
          setLoadingPrices(false);
        }
      },
      [callBackend]
    );

  /*
   * -------------------------------------------------------
   * SELECT SMSPOOL COUNTRY
   * -------------------------------------------------------
   */

  const selectCountry =
    async (country) => {
      setShowCountryMenu(false);

      setSelectedCountry(country);

      setSelectedService(null);

      setPrices({});

      /*
       * Once country is selected, load prices
       * for all services using that real provider
       * country ID.
       */
      if (
        server?.id === "b"
      ) {
        await loadServicePrices(
          "b",
          services,
          country.providerId ||
            country.id
        );
      }
    };

  /*
   * -------------------------------------------------------
   * SELECT SERVICE
   * -------------------------------------------------------
   */

  const selectService =
    (service) => {
      setError("");

      setSelectedService(
        service
      );
    };

  /*
   * -------------------------------------------------------
   * PURCHASE
   * -------------------------------------------------------
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
      !priceData?.customerPrice ||
      priceData.available === false
    ) {
      setError(
        "The live provider price is not available for this service. Please refresh and try again."
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
          `Provider: ${server.provider}\n` +
          `Country: ${countryName}\n\n` +
          `This will purchase a REAL number from the provider.`
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
          "Your account session has expired. Please log in again."
        );
      }

      const result =
        await callBackend({
          action: "order",
          serverId: server.id,
          service: serviceId,
          realId: serviceId,
          country: countryId,
          countryName,
          countryProviderId:
            countryId,
          userEmail:
            user.email
        });

      if (!result?.success) {
        throw new Error(
          result?.error ||
            "The provider rejected the purchase."
        );
      }

      if (!result?.phone) {
        throw new Error(
          "The provider accepted the order but did not return a phone number."
        );
      }

      const purchased = {
        phone:
          result.phone,
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
        provider:
          server.provider,
        price:
          Number(
            result.charged ||
              price
          )
      };

      setPurchasedNumber(
        purchased
      );

      setOtp("");
      setOtpMessage("");

      /*
       * Keep the selected number visible.
       */
      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });
    } catch (err) {
      console.error(
        "VIRTUAL NUMBER PURCHASE ERROR:",
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
   * -------------------------------------------------------
   * CHECK OTP
   * -------------------------------------------------------
   */

  const checkOtp = async () => {
    if (!purchasedNumber) {
      return;
    }

    if (!purchasedNumber.orderId) {
      setOtpMessage(
        "This order does not have a provider order ID."
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
            purchasedNumber.orderId
        });

      const code =
        result?.code ||
        "";

      if (code) {
        setOtp(code);

        setOtpMessage(
          "OTP received successfully."
        );
      } else {
        setOtpMessage(
          result?.status
            ? `Current status: ${result.status}. No OTP has arrived yet.`
            : "No OTP has arrived yet. Please try again."
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
   * -------------------------------------------------------
   * COPY NUMBER
   * -------------------------------------------------------
   */

  const copyNumber = async () => {
    if (
      !purchasedNumber?.phone
    ) {
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
        "Unable to copy the number."
      );
    }
  };

  /*
   * -------------------------------------------------------
   * BACK TO SERVER SELECTION
   * -------------------------------------------------------
   */

  const backToServers = () => {
    setServer(null);
    setServices([]);
    setCountries([]);
    setSelectedService(null);
    setSelectedCountry(null);
    setPrices({});
    setPurchasedNumber(null);
    setError("");
    setOtp("");
    setOtpMessage("");
  };

  /*
   * -------------------------------------------------------
   * SERVICE AVAILABILITY
   * -------------------------------------------------------
   */

  const visibleServices =
    useMemo(() => {
      return services;
    }, [services]);

  /*
   * -------------------------------------------------------
   * UI
   * -------------------------------------------------------
   */

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* HEADER */}

      <div className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            {server ? (
              <button
                type="button"
                onClick={backToServers}
                className="rounded-xl p-2 hover:bg-slate-100"
              >
                <ArrowLeft
                  size={20}
                />
              </button>
            ) : null}

            <div>
              <h1 className="text-xl font-bold">
                Virtual Numbers
              </h1>

              <p className="text-xs text-slate-500">
                Real provider numbers and OTP
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (server) {
                if (server.id === "a") {
                  loadFleexaServices();
                } else if (
                  selectedCountry
                ) {
                  loadServicePrices(
                    "b",
                    services,
                    selectedCountry.providerId ||
                      selectedCountry.id
                  );
                }
              } else {
                loadServers();
              }
            }}
            className="rounded-xl p-2 hover:bg-slate-100"
            disabled={
              loading ||
              loadingServices ||
              loadingPrices
            }
          >
            <RefreshCw
              size={20}
              className={
                loading ||
                loadingServices ||
                loadingPrices
                  ? "animate-spin"
                  : ""
              }
            />
          </button>
        </div>
      </div>

      {/* BODY */}

      <div className="mx-auto max-w-6xl px-4 py-6">
        {/* ERROR */}

        {error ? (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <X
              size={16}
              className="mt-0.5 shrink-0"
            />

            <span>{error}</span>
          </div>
        ) : null}

        {/* SERVER SELECTION */}

        {!server ? (
          loading ? (
            <div className="flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-10 text-slate-500">
              <Loader2
                size={20}
                className="animate-spin"
              />

              <span className="text-sm">
                Loading virtual-number servers…
              </span>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {serverOptions.map(
                (option) => {
                  const OptionIcon =
                    option.icon;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() =>
                        selectServer(
                          option
                        )
                      }
                      className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-blue-300 hover:shadow-md"
                    >
                      <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-blue-100 p-2.5 text-blue-600">
                          <OptionIcon
                            size={20}
                          />
                        </div>

                        <div>
                          <p className="font-semibold">
                            {
                              option.name
                            }
                          </p>

                          <p className="text-xs text-slate-500">
                            {
                              option.provider
                            }
                          </p>
                        </div>
                      </div>

                      <p className="mt-3 text-sm text-slate-600">
                        {
                          option.description
                        }
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        {option.country}
                      </p>
                    </button>
                  );
                }
              )}
            </div>
          )
        ) : (
          <div className="space-y-6">
            {/* SELECTED SERVER */}

            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="rounded-xl bg-blue-100 p-2.5 text-blue-600">
                <Server size={20} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {server.name}
                </p>

                <p className="text-xs text-slate-500">
                  {server.provider} •{" "}
                  {server.description}
                </p>
              </div>

              <ShieldCheck
                size={18}
                className="shrink-0 text-green-600"
              />
            </div>

            {/* COUNTRY (SMSPool) */}

            {server.id === "b" ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() =>
                    setShowCountryMenu(
                      !showCountryMenu
                    )
                  }
                  className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <span className="text-sm">
                    {selectedCountry
                      ? selectedCountry.name
                      : loadingCountries
                      ? "Loading countries…"
                      : "Select a country"}
                  </span>

                  <ChevronDown
                    size={18}
                    className="text-slate-400"
                  />
                </button>

                {showCountryMenu ? (
                  <div className="scrollbar-thin absolute z-30 mt-2 max-h-64 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-lg">
                    {loadingCountries ? (
                      <div className="flex items-center justify-center gap-2 p-4 text-sm text-slate-500">
                        <Loader2
                          size={16}
                          className="animate-spin"
                        />

                        <span>
                          Loading…
                        </span>
                      </div>
                    ) : countries.length ===
                      0 ? (
                      <p className="p-4 text-sm text-slate-500">
                        No countries
                        available.
                      </p>
                    ) : (
                      countries.map(
                        (country) => {
                          const isActive =
                            selectedCountry?.id ===
                            country.id;

                          return (
                            <button
                              key={
                                country.id
                              }
                              type="button"
                              onClick={() =>
                                selectCountry(
                                  country
                                )
                              }
                              className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-slate-50"
                            >
                              <span>
                                {
                                  country.name
                                }
                              </span>

                              {isActive ? (
                                <Check
                                  size={
                                    16
                                  }
                                  className="text-blue-600"
                                />
                              ) : null}
                            </button>
                          );
                        }
                      )
                    )}
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* SERVICES */}

            <ServiceOptions
              loadingServices={
                loadingServices
              }
              loadingPrices={loadingPrices}
              services={visibleServices}
              prices={prices}
              selectedService={selectedService}
              emptyHint={
                server.id === "b" &&
                !selectedCountry
                  ? "Select a country to see available services."
                  : ""
              }
              onSelect={selectService}
            />

            {/* BUY */}

            {selectedService ? (
              <Button
                onClick={handleBuy}
                disabled={buying}
                className="w-full"
                size="lg"
              >
                {buying ? (
                  <>
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />
                    Purchasing from
                    provider…
                  </>
                ) : (
                  <>
                    <Phone size={16} />
                    Buy{" "}
                    {selectedService.name ||
                      selectedService.id}
                  </>
                )}
              </Button>
            ) : null}

            {/* PURCHASED NUMBER */}

            <PurchasedNumberCard
              purchasedNumber={
                purchasedNumber
              }
              otp={otp}
              otpMessage={otpMessage}
              checkingOtp={checkingOtp}
              copied={copied}
              onCopy={copyNumber}
              onCheckOtp={checkOtp}
            />
          </div>
        )}
      </div>
    </div>
  );
}

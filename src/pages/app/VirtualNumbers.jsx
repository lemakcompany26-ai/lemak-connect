import { useCallback, useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { formatNaira } from "@/lib/format";

export default function VirtualNumbers() {
  const [servers, setServers] = useState([]);
  const [selectedServer, setSelectedServer] = useState(null);
  const [catalog, setCatalog] = useState(null);

  const [country, setCountry] = useState("");
  const [countryName, setCountryName] = useState("");
  const [countryProviderId, setCountryProviderId] = useState("");

  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingPrices, setLoadingPrices] = useState(false);

  const [buying, setBuying] = useState(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result =
        await base44.functions.invoke(
          "virtualNumbers",
          {
            action: "provider_catalog",
          }
        );

      const data =
        result?.data || result;

      const liveServers =
        Array.isArray(data?.servers)
          ? data.servers
          : [];

      setServers(liveServers);
    } catch (e) {
      console.error(e);
      setError(
        e?.message ||
          "Unable to load virtual-number providers."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /* =====================================================
     LOAD REAL PRICES
  ===================================================== */

  const loadPrices = async (
    server,
    selectedCountryProviderId = ""
  ) => {
    const services =
      server?.smsServices || [];

    if (!services.length) return;

    setLoadingPrices(true);
    setPrices({});

    const firstServices =
      services.slice(0, 30);

    const results = await Promise.allSettled(
      firstServices.map(async (item) => {
        const result =
          await base44.functions.invoke(
            "virtualNumbers",
            {
              action: "quote",

              serverId: server.id,

              service: item.id,

              realId: item.realId,

              country:
                server.id === "a"
                  ? "US"
                  : country || "US",

              countryProviderId:
                server.id === "a"
                  ? "US"
                  : selectedCountryProviderId ||
                    "US",
            }
          );

        return result?.data || result;
      })
    );

    const nextPrices = {};

    for (const result of results) {
      if (
        result.status !== "fulfilled"
      ) {
        continue;
      }

      const data = result.value;

      if (data?.prices) {
        Object.assign(
          nextPrices,
          data.prices
        );
      }
    }

    setPrices(nextPrices);
    setLoadingPrices(false);
  };

  /* =====================================================
     SELECT SERVER
  ===================================================== */

  const selectServer = async (server) => {
    if (!server?.online) return;

    setSelectedServer(server.id);
    setCatalog(server);
    setSearch("");
    setError("");
    setPrices({});

    if (server.id === "a") {
      setCountry("US");
      setCountryName("United States");
      setCountryProviderId("US");

      await loadPrices(
        server,
        "US"
      );
    } else {
      setCountry("");
      setCountryName("");
      setCountryProviderId("");
    }
  };

  /* =====================================================
     SELECT COUNTRY
  ===================================================== */

  const selectCountry = async (
    code,
    name,
    providerId
  ) => {
    setCountry(code);
    setCountryName(name);
    setCountryProviderId(
      providerId || code
    );

    if (!catalog) return;

    await loadPrices(
      catalog,
      providerId || code
    );
  };

  /* =====================================================
     BUY
  ===================================================== */

  const handleBuy = async (item) => {
    if (!catalog) return;

    const priceData =
      prices[item.id];

    if (!priceData?.customerPrice) {
      alert(
        "Live price is not available yet. Please wait a moment and try again."
      );
      return;
    }

    const price =
      Number(
        priceData.customerPrice
      );

    const confirmed = window.confirm(
      `Buy ${item.name || item.id} ${
        country || "US"
      } for ${formatNaira(price)}?`
    );

    if (!confirmed) return;

    setBuying(item.id);
    setError("");

    try {
      const user =
        await base44.auth.me();

      if (!user?.email) {
        throw new Error(
          "Please sign in before buying a number."
        );
      }

      const result =
        await base44.functions.invoke(
          "virtualNumbers",
          {
            action: "order",

            serverId:
              catalog.id,

            service:
              item.id,

            realId:
              item.realId,

            country:
              country ||
              "US",

            countryName:
              countryName ||
              "United States",

            countryProviderId:
              countryProviderId ||
              country ||
              "US",

            // Sent only for display/reference.
            // Backend recalculates the actual price.
            price,
            
            userEmail:
              user.email,
          }
        );

      const data =
        result?.data || result;

      if (!data?.success) {
        throw new Error(
          data?.error ||
            "Number purchase failed."
        );
      }

      const phone =
        data.phone;

      const charged =
        Number(
          data.charged || price
        );

      alert(
        `Number purchased successfully!\n\nNumber: ${phone}\nPrice: ${formatNaira(
          charged
        )}\n\nYour OTP will appear in your rental/chat area.`
      );

      // Go to rental/chat area
      window.location.href =
        "/rentals";
    } catch (e) {
      console.error(e);

      const message =
        e?.message ||
        "Unable to purchase number.";

      setError(message);
      alert(message);
    } finally {
      setBuying(null);
    }
  };

  /* =====================================================
     FILTER
  ===================================================== */

  const filteredServices =
    useMemo(() => {
      const services =
        catalog?.smsServices || [];

      const term =
        search
          .trim()
          .toLowerCase();

      if (!term) return services;

      return services.filter(
        (service) =>
          String(
            service.name ||
              service.id
          )
            .toLowerCase()
            .includes(term)
      );
    }, [catalog, search]);

  /* =====================================================
     LOADING
  ===================================================== */

  if (loading) {
    return (
      <div className="p-10 text-center text-zinc-400">
        Loading live providers...
      </div>
    );
  }

  /* =====================================================
     PROVIDER SELECTION
  ===================================================== */

  if (!selectedServer) {
    return (
      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        <div>
          <h1 className="text-white text-xl font-bold">
            Virtual Numbers
          </h1>

          <p className="text-xs text-zinc-400 mt-1">
            Choose a live provider to view
            real services and live pricing.
          </p>
        </div>

        {error && (
          <div className="bg-red-950/40 border border-red-800 text-red-300 rounded-xl p-3 text-xs">
            {error}
          </div>
        )}

        <div className="grid gap-3">
          {servers.map((server) => (
            <button
              key={server.id}
              type="button"
              disabled={!server.online}
              onClick={() =>
                selectServer(server)
              }
              className={`p-5 rounded-2xl border text-left transition ${
                server.online
                  ? "border-zinc-700 bg-zinc-800 hover:border-amber-400"
                  : "border-red-900/50 bg-zinc-900 opacity-60"
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-white font-bold text-base">
                    {server.id === "a"
                      ? "Server 1"
                      : "Server 2"}
                  </div>

                  <div className="text-xs text-zinc-300 mt-1">
                    {server.subtitle}
                  </div>

                  <div className="text-[11px] text-zinc-500 mt-2">
                    {server.online
                      ? `${
                          server.smsServices
                            ?.length || 0
                        } live services`
                      : "Provider unavailable"}
                  </div>
                </div>

                <div
                  className={`w-3 h-3 rounded-full ${
                    server.online
                      ? "bg-green-500 animate-pulse"
                      : "bg-red-500"
                  }`}
                />
              </div>

              <div className="mt-3 text-xs text-amber-400 font-bold">
                {server.online
                  ? "Tap to view live services →"
                  : "Currently unavailable"}
              </div>
            </button>
          ))}
        </div>

        {servers.length === 0 && (
          <div className="text-zinc-500 text-sm border border-zinc-800 p-4 rounded-xl">
            No provider response.
            Check your Base44 backend function
            and provider secrets.
          </div>
        )}
      </div>
    );
  }

  /* =====================================================
     MAIN PAGE
  ===================================================== */

  return (
    <div className="p-4 space-y-4 pb-24 max-w-2xl mx-auto">
      {/* HEADER */}

      <div className="flex justify-between items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setSelectedServer(null);
            setCatalog(null);
            setCountry("");
            setCountryName("");
            setCountryProviderId("");
            setPrices({});
            setError("");
          }}
          className="text-xs text-zinc-400 border border-zinc-700 px-3 py-1.5 rounded-full hover:bg-zinc-800"
        >
          ← Change Server
        </button>

        <div className="text-xs text-white font-bold bg-zinc-800 px-3 py-1 rounded-full">
          {selectedServer === "a"
            ? "Server 1 • Fleexa"
            : "Server 2 • SMSPool"}
        </div>
      </div>

      {/* ERROR */}

      {error && (
        <div className="bg-red-950/40 border border-red-800 text-red-300 rounded-xl p-3 text-xs">
          {error}
        </div>
      )}

      {/* COUNTRY */}

      {selectedServer === "b" &&
        !country && (
          <div className="space-y-3">
            <div className="text-sm text-white font-bold">
              Select Country
            </div>

            <div className="grid grid-cols-2 gap-2">
              {(catalog?.countries || []).map(
                (item) => (
                  <button
                    key={`${item.code}-${item.providerId}`}
                    type="button"
                    onClick={() =>
                      selectCountry(
                        item.code,
                        item.name,
                        item.providerId
                      )
                    }
                    className="bg-zinc-800 border border-zinc-700 p-3 rounded-xl text-left hover:border-amber-400"
                  >
                    <div className="text-white text-sm font-bold">
                      {item.code}
                    </div>

                    <div className="text-xs text-zinc-400">
                      {item.name}
                    </div>
                  </button>
                )
              )}
            </div>

            {(!catalog?.countries ||
              catalog.countries.length === 0) && (
              <div className="text-xs text-zinc-500">
                No countries returned by
                SMSPool.
              </div>
            )}
          </div>
        )}

      {/* COUNTRY HEADER */}

      {selectedServer === "b" &&
        country && (
          <div className="flex justify-between items-center">
            <div>
              <div className="text-xs text-zinc-400">
                Live country
              </div>

              <div className="text-white font-bold">
                {countryName ||
                  country}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setCountry("");
                setCountryName("");
                setCountryProviderId("");
                setPrices({});
              }}
              className="text-xs text-amber-400"
            >
              Change
            </button>
          </div>
        )}

      {/* SEARCH */}

      {(selectedServer === "a" ||
        country) && (
        <input
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
          placeholder="Search WhatsApp, Telegram, Google..."
          className="w-full bg-zinc-800 border border-zinc-700 rounded-full px-4 py-2.5 text-sm text-white outline-none"
        />
      )}

      {/* PRICE LOADING */}

      {loadingPrices && (
        <div className="text-xs text-zinc-400 text-center py-2">
          Loading live provider prices...
        </div>
      )}

      {/* SERVICES */}

      {(selectedServer === "a" ||
        country) && (
        <div className="space-y-2">
          {filteredServices.map(
            (item) => {
              const p =
                prices[item.id];

              return (
                <div
                  key={`${item.id}-${item.realId}`}
                  className="bg-zinc-800 border border-zinc-700 p-3 rounded-xl flex justify-between items-center gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-white text-sm font-bold capitalize truncate">
                      {item.name ||
                        item.id}
                    </div>

                    <div className="text-[11px] text-zinc-400 mt-1">
                      {selectedServer ===
                      "a"
                        ? "US • Fleexa"
                        : `${country} • SMSPool`}
                    </div>

                    {item.available !=
                      null && (
                      <div className="text-[10px] text-green-400 mt-1">
                        Provider stock:{" "}
                        {
                          item.available
                        }
                      </div>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-amber-400 text-xs font-bold">
                      {p?.customerPrice
                        ? formatNaira(
                            p.customerPrice
                          )
                        : "Checking..."}
                    </div>

                    <button
                      type="button"
                      disabled={
                        buying ===
                          item.id ||
                        !p?.customerPrice
                      }
                      onClick={() =>
                        handleBuy(item)
                      }
                      className="mt-1 text-[11px] bg-white text-black px-3 py-1 rounded-full font-bold disabled:opacity-40"
                    >
                      {buying ===
                      item.id
                        ? "Buying..."
                        : "Buy Real Number"}
                    </button>
                  </div>
                </div>
              );
            }
          )}

          {!loadingPrices &&
            filteredServices.length ===
              0 && (
              <div className="text-zinc-500 text-sm border border-zinc-800 p-4 rounded-xl">
                No services returned by
                this provider.
              </div>
            )}
        </div>
      )}

      {/* IMPORTANT: NO FAKE EMAIL/RENT PRICES */}

      <div className="border border-zinc-800 rounded-xl p-3 text-[11px] text-zinc-500">
        Numbers and prices shown here are
        requested from the connected provider.
        The phone number itself is only
        displayed after the provider confirms
        the purchase.
      </div>
    </div>
  );
              }

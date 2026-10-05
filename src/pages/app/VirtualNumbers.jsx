import { useEffect, useState } from "react";
import { Loader2, RefreshCw, Copy, X } from "lucide-react";
import { base44 } from "@/api/base44Client";

const money = n =>
  `₦${Number(n || 0).toLocaleString("en-NG", {
    minimumFractionDigits: 2
  })}`;

const getErr = e =>
  e?.response?.data?.error ||
  e?.message ||
  "Request failed.";

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
  const [buying, setBuying] = useState(false);
  const [error, setError] = useState("");

  const call = async params => {
    const r = await base44.functions.invoke(
      "virtualNumbers",
      params
    );

    const d = r?.data || r;

    if (!d?.success) {
      throw new Error(d?.error || "Request failed.");
    }

    return d;
  };

  const load = async s => {
    try {
      setLoadingServices(true);
      setError("");
      setServices([]);
      setCountries([]);
      setPrices({});

      const [sv, co] = await Promise.all([
        call({
          action: "services",
          serverId: s
        }),
        call({
          action: "countries",
          serverId: s
        })
      ]);

      setServices(sv.services || []);
      setCountries(co.countries || []);

      const first =
        s === "a"
          ? "US"
          : co.countries?.[0]?.providerId ||
            co.countries?.[0]?.id ||
            "";

      setCountry(first);
    } catch (e) {
      setError(getErr(e));
    } finally {
      setLoadingServices(false);
    }
  };

  useEffect(() => {
    let dead = false;

    const start = async () => {
      try {
        const d = await call({
          action: "catalog"
        });

        if (dead) return;

        const list = d.servers || [];

        setServers(list);

        const first =
          list.find(x => x.available)?.id || "a";

        setServer(first);

        // Do NOT wait for services.
        setLoading(false);

        load(first);
      } catch (e) {
        if (!dead) {
          setError(getErr(e));
          setLoading(false);
        }
      }
    };

    start();

    return () => {
      dead = true;
    };
  }, []);

  useEffect(() => {
    if (!services.length) return;

    let cancelled = false;

    const loadPrices = async () => {
      for (const x of services) {
        if (cancelled) return;

        try {
          const d = await call({
            action: "price",
            serverId: server,
            service: x.realId || x.id,
            country
          });

          if (!cancelled) {
            setPrices(old => ({
              ...old,
              [x.id]: d
            }));
          }
        } catch (e) {
          if (!cancelled) {
            setPrices(old => ({
              ...old,
              [x.id]: {
                error: getErr(e)
              }
            }));
          }
        }
      }
    };

    loadPrices();

    return () => {
      cancelled = true;
    };
  }, [services, country, server]);

  const changeServer = s => {
    if (s === server) return;

    setServer(s);
    setActive(null);
    setOtp(null);
    setServices([]);
    setCountries([]);
    setPrices({});
    setCountry("");

    load(s);
  };

  const buy = async x => {
    const p = prices[x.id];

    if (!p?.customerPrice) {
      alert(
        "Live price is still loading. Please wait."
      );
      return;
    }

    if (server === "b" && !country) {
      alert("Select a country.");
      return;
    }

    if (
      !confirm(
        `Buy ${x.name} for ${money(
          p.customerPrice
        )}?`
      )
    ) {
      return;
    }

    try {
      setBuying(true);
      setError("");

      const user = await base44.auth.me();

      if (!user?.email) {
        throw new Error("Please log in first.");
      }

      const selected = countries.find(
        c =>
          (c.providerId || c.id) === country
      );

      const d = await call({
        action: "order",
        serverId: server,
        userEmail: user.email,
        service: x.realId || x.id,
        realId: x.realId || x.id,
        country,
        countryName:
          server === "a"
            ? "United States"
            : selected?.name || country,
        countryProviderId:
          selected?.providerId ||
          selected?.id ||
          country,
        price: p.customerPrice
      });

      setActive({
        ...d,
        serviceName: x.name
      });

      setOtp(null);

      alert(
        `Number: ${d.phone}\nOrder: ${d.orderId}`
      );
    } catch (e) {
      setError(getErr(e));
    } finally {
      setBuying(false);
    }
  };

  const check = async () => {
    if (!active?.orderId) return;

    try {
      const d = await call({
        action: "checkOtp",
        serverId:
          active.serverId || server,
        orderId: active.orderId,
        requestId: active.requestId
      });

      setOtp(d);
    } catch {}
  };

  useEffect(() => {
    if (!active?.orderId) return;

    check();

    const timer = setInterval(
      check,
      10000
    );

    return () => clearInterval(timer);
  }, [active?.orderId]);

  const cancel = async () => {
    if (!active) return;

    if (
      !confirm(
        "Cancel this number and refund your wallet?"
      )
    ) {
      return;
    }

    try {
      setBuying(true);

      const d = await call({
        action: "cancel",
        serverId:
          active.serverId || server,
        orderId: active.orderId,
        requestId: active.requestId
      });

      alert(
        d.message || "Number cancelled."
      );

      setActive(null);
      setOtp(null);
    } catch (e) {
      setError(getErr(e));
    } finally {
      setBuying(false);
    }
  };

  if (loading) {
    return (
      <div className="p-10 text-center">
        <Loader2 className="mx-auto animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">
        Virtual Numbers
      </h1>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-100 text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-5">
        {servers.map(s => (
          <button
            key={s.id}
            disabled={!s.available}
            onClick={() =>
              changeServer(s.id)
            }
            className={`p-4 rounded-xl border ${
              server === s.id
                ? "bg-primary text-white"
                : ""
            } ${
              !s.available
                ? "opacity-50"
                : ""
            }`}
          >
            <b>{s.name}</b>
            <div className="text-xs mt-1">
              {s.available
                ? "Available"
                : "Not configured"}
            </div>
          </button>
        ))}
      </div>

      {server === "b" && (
        <select
          value={country}
          onChange={e => {
            setCountry(e.target.value);
            setPrices({});
          }}
          className="w-full border rounded-xl p-3 mb-5 bg-background"
        >
          <option value="">
            Select country
          </option>

          {countries.map(c => (
            <option
              key={
                c.providerId || c.id
              }
              value={
                c.providerId || c.id
              }
            >
              {c.name || c.code}
            </option>
          ))}
        </select>
      )}

      {active && (
        <div className="border-2 border-primary rounded-2xl p-4 mb-5">
          <b className="text-lg">
            Active Number
          </b>

          <div className="text-2xl font-bold my-3">
            {active.phone}
          </div>

          <button
            className="border p-2 rounded-lg mr-2"
            onClick={() =>
              navigator.clipboard.writeText(
                active.phone
              )
            }
          >
            <Copy className="w-4 h-4" />
          </button>

          <div className="my-4 p-4 rounded-xl bg-muted">
            <b>OTP:</b>{" "}
            {otp?.code ||
              otp?.smsText ||
              "Waiting for OTP..."}
          </div>

          <button
            onClick={check}
            className="border rounded-xl p-3 mr-2"
          >
            <RefreshCw className="inline w-4 h-4 mr-1" />
            Check OTP
          </button>

          <button
            onClick={cancel}
            disabled={buying}
            className="bg-red-600 text-white rounded-xl p-3"
          >
            <X className="inline w-4 h-4 mr-1" />
            Cancel & Refund
          </button>
        </div>
      )}

      {loadingServices ? (
        <div className="text-center py-10">
          <Loader2 className="mx-auto animate-spin" />
          <p className="text-sm mt-2">
            Loading services...
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {services.map(x => {
            const p = prices[x.id];

            return (
              <div
                key={x.id}
                className="border rounded-2xl p-4"
              >
                <b>{x.name}</b>

                <div className="text-xl font-bold my-3">
                  {p?.customerPrice
                    ? money(p.customerPrice)
                    : "Loading price..."}
                </div>

                <button
                  onClick={() => buy(x)}
                  disabled={
                    buying ||
                    !p?.customerPrice ||
                    (server === "b" &&
                      !country)
                  }
                  className="w-full bg-primary text-white rounded-xl p-3 disabled:opacity-50"
                >
                  {buying
                    ? "Processing..."
                    : "Buy Number"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
    ):
}

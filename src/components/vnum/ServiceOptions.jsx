import {
  Check,
  CircleDollarSign,
  Loader2,
  Timer
} from "lucide-react";

const formatNaira = (amount) => {
  const value = Number(amount || 0);

  return `₦${value.toLocaleString("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })}`;
};

export default function ServiceOptions({
  loadingServices,
  loadingPrices,
  services,
  prices,
  selectedService,
  emptyHint,
  onSelect
}) {
  if (loadingServices) {
    return (
      <div className="flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-10 text-slate-500">
        <Loader2
          size={20}
          className="animate-spin"
        />

        <span className="text-sm">
          Loading services…
        </span>
      </div>
    );
  }

  if (!Array.isArray(services) || services.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
        {emptyHint ||
          "No services are available on this server right now."}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {services.map((service) => {
        const serviceId =
          service.realId || service.id;

        const priceData = prices[serviceId];

        const isSelected =
          selectedService?.id === service.id;

        const available = priceData
          ? priceData.available !== false &&
            Number(priceData.customerPrice || 0) > 0
          : false;

        return (
          <button
            key={service.id}
            type="button"
            onClick={() => onSelect(service)}
            disabled={!available}
            className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left shadow-sm transition ${
              isSelected
                ? "border-blue-500 bg-blue-50"
                : available
                ? "border-slate-200 bg-white hover:border-blue-300"
                : "border-slate-200 bg-slate-100 opacity-60"
            }`}
          >
            <div className="min-w-0">
              <p className="font-medium">
                {service.name || service.id}
              </p>

              <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                {loadingPrices && !priceData ? (
                  <>
                    <Loader2
                      size={12}
                      className="animate-spin"
                    />
                    Checking price…
                  </>
                ) : available ? (
                  <>
                    <Timer size={12} />
                    One-time number rental
                  </>
                ) : (
                  "Currently unavailable"
                )}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              {available ? (
                <span className="flex items-center gap-1 font-semibold text-blue-600">
                  <CircleDollarSign size={16} />
                  {formatNaira(
                    priceData.customerPrice
                  )}
                </span>
              ) : null}

              {isSelected ? (
                <Check
                  size={18}
                  className="text-blue-600"
                />
              ) : null}
            </div>
          </button>
        );
      })}
    </div>
  );
}
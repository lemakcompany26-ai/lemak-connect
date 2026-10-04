import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatNaira } from "@/lib/format";

function PriceLabel({ data, loadingPrices }) {
  const price = Number(data?.customerPrice);

  if (Number.isFinite(price) && price > 0) {
    return <span className="font-bold">{formatNaira(price)}</span>;
  }

  if (data?.error) {
    return <span className="text-xs text-muted-foreground">Unavailable</span>;
  }

  return loadingPrices ? (
    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
  ) : (
    <span className="text-xs text-muted-foreground">—</span>
  );
}

export default function NumberServiceList({
  services,
  prices,
  loadingPrices,
  buying,
  onBuy,
}) {
  if (!services.length) {
    return (
      <p className="rounded-2xl border bg-card p-4 text-sm text-muted-foreground">
        No services found.
      </p>
    );
  }

  return (
    <div className="divide-y rounded-2xl border bg-card">
      {services.map((item) => {
        const data = prices[item.id];
        const price = Number(data?.customerPrice);
        const ready = Number.isFinite(price) && price > 0;

        return (
          <div
            key={item.id}
            className="flex items-center justify-between gap-3 p-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {item.name || item.id}
              </p>
              <div className="mt-0.5">
                <PriceLabel data={data} loadingPrices={loadingPrices} />
              </div>
            </div>

            <Button
              size="sm"
              disabled={!ready || Boolean(buying)}
              onClick={() => onBuy(item)}
            >
              {buying === item.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Buy"
              )}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
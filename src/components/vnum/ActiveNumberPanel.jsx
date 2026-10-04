import {
  Copy,
  Loader2,
  MessageSquare,
  RefreshCw,
  Timer,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatNaira } from "@/lib/format";

export default function ActiveNumberPanel({
  purchase,
  otp,
  timerLabel,
  checking,
  cancelling,
  onCopy,
  onCheck,
  onCancel,
  onClose,
}) {
  if (!purchase) return null;

  const received = Boolean(otp?.code);

  return (
    <div className="mb-6 rounded-2xl border border-blue-200 bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Your number
          </p>
          <p className="mt-1 truncate font-mono text-lg font-bold">
            {purchase.phone}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {purchase.service}
            {purchase.countryName ? ` • ${purchase.countryName}` : ""}
            {" • "}
            {formatNaira(purchase.customerPrice)}
          </p>
        </div>

        <button
          type="button"
          onClick={onCopy}
          className="shrink-0 rounded-xl bg-blue-50 p-2 text-blue-600 hover:bg-blue-100"
        >
          <Copy className="h-5 w-5" />
        </button>
      </div>

      <div className="mt-4 rounded-xl bg-muted p-3">
        {received ? (
          <>
            <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <MessageSquare className="h-4 w-4" />
              Verification code
            </p>
            <p className="mt-1 font-mono text-2xl font-bold tracking-widest">
              {otp.code}
            </p>
            {otp.smsText && (
              <p className="mt-2 break-words text-xs text-muted-foreground">
                {otp.smsText}
              </p>
            )}
          </>
        ) : (
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Waiting for SMS...
            </span>
            <span className="flex items-center gap-1 font-mono font-semibold">
              <Timer className="h-4 w-4" />
              {timerLabel}
            </span>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {received ? (
          <Button className="flex-1" onClick={onClose}>
            Done
          </Button>
        ) : (
          <>
            <Button
              className="flex-1"
              onClick={onCheck}
              disabled={checking || cancelling}
            >
              {checking ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Check code
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={onCancel}
              disabled={checking || cancelling}
            >
              {cancelling ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <X className="h-4 w-4" />
              )}
              Cancel
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
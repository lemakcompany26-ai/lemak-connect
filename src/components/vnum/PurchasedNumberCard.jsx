import {
  Check,
  CircleDollarSign,
  Copy,
  Loader2,
  MessageSquare
} from "lucide-react";

import { Button } from "@/components/ui/button";

const formatNaira = (amount) => {
  const value = Number(amount || 0);

  return `₦${value.toLocaleString("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })}`;
};

export default function PurchasedNumberCard({
  purchasedNumber,
  otp,
  otpMessage,
  checkingOtp,
  copied,
  onCopy,
  onCheckOtp
}) {
  if (!purchasedNumber) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Your number
          </p>

          <p className="mt-1 truncate font-mono text-lg font-bold">
            {purchasedNumber.phone}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {purchasedNumber.service} •{" "}
            {purchasedNumber.country} •{" "}
            {purchasedNumber.server}
          </p>
        </div>

        <button
          type="button"
          onClick={onCopy}
          className="shrink-0 rounded-xl bg-blue-50 p-2 text-blue-600 hover:bg-blue-100"
        >
          {copied ? (
            <Check size={18} />
          ) : (
            <Copy size={18} />
          )}
        </button>
      </div>

      <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm">
        <p className="flex items-center gap-2 font-medium">
          <CircleDollarSign
            size={16}
            className="text-blue-600"
          />
          Charged:{" "}
          {formatNaira(purchasedNumber.price)}
        </p>

        <p className="mt-2 flex items-start gap-2 text-xs text-slate-500">
          <MessageSquare
            size={14}
            className="mt-0.5 shrink-0"
          />
          Use the number for{" "}
          {purchasedNumber.service}, then check
          below for the OTP code.
        </p>
      </div>

      {/* OTP */}

      <div className="mt-4 border-t border-slate-100 pt-4">
        {otp ? (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-center">
            <p className="text-xs font-medium uppercase tracking-wide text-green-700">
              OTP received
            </p>

            <p className="mt-1 font-mono text-2xl font-bold tracking-widest text-green-800">
              {otp}
            </p>
          </div>
        ) : null}

        {otpMessage ? (
          <p className="mb-3 text-xs text-slate-600">
            {otpMessage}
          </p>
        ) : null}

        <Button
          onClick={onCheckOtp}
          disabled={checkingOtp}
          variant="outline"
          className="w-full"
        >
          {checkingOtp ? (
            <>
              <Loader2
                size={16}
                className="animate-spin"
              />
              Checking for OTP…
            </>
          ) : (
            <>
              <MessageSquare size={16} />
              Check for OTP
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
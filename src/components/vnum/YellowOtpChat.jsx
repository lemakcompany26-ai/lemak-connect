import {
  CheckCircle2,
  Clock3,
  Copy,
  KeyRound,
  Loader2,
  MessageSquare,
  Phone,
  RefreshCw,
  X,
} from "lucide-react";

export default function YellowOtpChat({
  active,
  otpCode,
  smsText,
  checking,
  cancelling,
  onCopy,
  onCheck,
  onCancel,
  onClose,
}) {
  if (!active) return null;

  const hasOtp = Boolean(otpCode) || Boolean(smsText);

  return (
    <div className="mb-6 overflow-hidden rounded-3xl border-2 border-yellow-400 shadow-lg">
      <div className="bg-yellow-400 px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-black/10">
              <MessageSquare className="h-6 w-6 text-black" />
            </div>

            <div>
              <div className="font-bold text-black">OTP Chat</div>
              <div className="text-xs text-black/70">
                {active.serviceName || "Virtual Number"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 text-xs font-medium text-black">
            {hasOtp ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-700" />
                Code received
              </>
            ) : (
              <>
                <Clock3 className="h-4 w-4" />
                Waiting for SMS
              </>
            )}
          </div>
        </div>
      </div>

      <div className="min-h-[260px] bg-[#fff9db] p-4">
        <div className="mb-4 flex gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-yellow-400">
            <Phone className="h-4 w-4 text-black" />
          </div>

          <div className="max-w-[85%]">
            <div className="rounded-2xl rounded-tl-sm border border-yellow-200 bg-white p-3 shadow-sm">
              <div className="mb-1 text-xs text-muted-foreground">
                Your virtual number
              </div>

              <div className="break-all text-xl font-bold tracking-wide">
                {active.phone}
              </div>

              <div className="mt-1 text-xs text-muted-foreground">
                {active.countryName || "Selected country"}
              </div>
            </div>

            <button
              type="button"
              onClick={onCopy}
              className="mt-2 flex items-center gap-1 text-xs font-medium text-black/60"
            >
              <Copy className="h-3.5 w-3.5" />
              Copy number
            </button>
          </div>
        </div>

        {hasOtp ? (
          <div className="mb-4 flex justify-end">
            <div className="max-w-[85%] rounded-2xl rounded-br-sm border border-yellow-300 bg-yellow-400 px-4 py-3 text-black">
              <div className="flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-black/70">
                <KeyRound className="h-3 w-3" />
                Verification message
              </div>

              {otpCode && (
                <div className="mt-1 select-all break-all font-mono text-2xl font-extrabold tracking-widest">
                  {otpCode}
                </div>
              )}

              {smsText && (
                <div className="mt-1 whitespace-pre-wrap break-words text-xs font-medium">
                  {smsText}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="mb-4 flex gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-yellow-400">
              <Clock3 className="h-4 w-4 text-black" />
            </div>

            <div className="rounded-2xl rounded-tl-sm border border-yellow-200 bg-white p-3 text-sm text-muted-foreground shadow-sm">
              Use this number to request your verification code. It will appear
              here as soon as it arrives.
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {hasOtp ? (
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl bg-black p-3 text-sm font-semibold text-yellow-400"
            >
              Done
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onCheck}
                disabled={checking || cancelling}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-black p-3 text-sm font-semibold text-yellow-400 disabled:opacity-50"
              >
                {checking ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Check code
              </button>

              <button
                type="button"
                onClick={onCancel}
                disabled={checking || cancelling}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-black/20 bg-white p-3 text-sm font-semibold text-black disabled:opacity-50"
              >
                {cancelling ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4" />
                )}
                Cancel &amp; refund
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
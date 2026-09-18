import { useState } from 'react';
import { Check, Copy, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Yellow-themed verification feed. The buyer's own presence — the purchased
// number/email address, their messages and their OTP codes — arrives as
// large amber bubbles on the right with one-tap copy; system messages stay
// subtle on the left.
export default function OtpChatFeed({ messages, emptyHint, highlight }) {
  const [copied, setCopied] = useState(null);

  const copy = (id, text) => {
    if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied(c => (c === id ? null : c)), 1600);
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin space-y-3 px-4 py-4">
      {messages.length === 0 && !(highlight && highlight.value) && (
        <div className="h-full flex items-center justify-center px-6">
          <div className="rounded-2xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-xs font-semibold text-amber-300 text-center max-w-[85%]">
            {emptyHint}
          </div>
        </div>
      )}

      {/* The purchased number / email address — the buyer's identity in the chat */}
      {highlight && highlight.value && (
        <div className="flex justify-end">
          <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-amber-400 text-slate-900 border border-amber-300 px-4 py-3">
            <div className="text-[10px] font-extrabold uppercase tracking-wide text-slate-700">
              {highlight.label}
            </div>
            <div className="text-base font-extrabold font-mono break-all select-all mt-1">{highlight.value}</div>
            <Button
              size="sm"
              className="h-8 mt-2 rounded-full px-3 bg-slate-900 text-amber-400 hover:bg-slate-800"
              onClick={() => copy('handle', highlight.value)}
            >
              {copied === 'handle'
                ? <><Check className="w-3.5 h-3.5 mr-1" /> Copied</>
                : <><Copy className="w-3.5 h-3.5 mr-1" /> Copy</>}
            </Button>
          </div>
        </div>
      )}

      {messages.map(m => {
        // Buyer-side bubbles: OTP codes and the buyer's own messages.
        if (m.isOtp || m.senderRole === 'buyer') {
          return (
            <div key={m.id} className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-amber-400 text-slate-900 border border-amber-300 px-4 py-3">
                <div className="text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 text-slate-700">
                  {m.isOtp
                    ? <><KeyRound className="w-3 h-3" /> Verification message</>
                    : (m.senderName || 'You')}
                </div>
                <div className={m.isOtp
                  ? 'text-lg font-extrabold font-mono tracking-widest break-all mt-1 select-all'
                  : 'text-sm font-semibold break-words mt-1'}>
                  {m.content}
                </div>
                {m.isOtp && (
                  <Button
                    size="sm"
                    className="h-8 mt-2 rounded-full px-3 bg-slate-900 text-amber-400 hover:bg-slate-800"
                    onClick={() => copy(m.id, m.content)}
                  >
                    {copied === m.id
                      ? <><Check className="w-3.5 h-3.5 mr-1" /> Copied</>
                      : <><Copy className="w-3.5 h-3.5 mr-1" /> Copy OTP</>}
                  </Button>
                )}
              </div>
            </div>
          );
        }
        return (
          <div key={m.id} className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-mk-card2 border border-mk-border px-4 py-2.5">
              <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                {m.senderName || 'Lemak Connect'}
              </div>
              <p className="text-xs text-slate-200 mt-0.5 whitespace-pre-wrap break-words">{m.content}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
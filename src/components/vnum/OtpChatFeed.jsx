import { useState } from 'react';
import { Check, Copy, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Yellow-themed verification feed. OTP messages arrive as large amber
// bubbles with a one-tap copy; system messages stay subtle on the left.
export default function OtpChatFeed({ messages, emptyHint }) {
  const [copied, setCopied] = useState(null);

  const copy = (id, text) => {
    if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied(c => (c === id ? null : c)), 1600);
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin space-y-3 px-4 py-4">
      {messages.length === 0 && (
        <div className="h-full flex items-center justify-center text-xs text-slate-500 text-center px-6">
          {emptyHint}
        </div>
      )}
      {messages.map(m => {
        if (m.isOtp) {
          return (
            <div key={m.id} className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-amber-400 text-slate-900 border border-amber-300 px-4 py-3">
                <div className="text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 text-slate-700">
                  <KeyRound className="w-3 h-3" /> Verification message
                </div>
                <div className="text-lg font-extrabold font-mono tracking-widest break-all mt-1 select-all">{m.content}</div>
                <Button
                  size="sm"
                  className="h-8 mt-2 rounded-full px-3 bg-slate-900 text-amber-400 hover:bg-slate-800"
                  onClick={() => copy(m.id, m.content)}
                >
                  {copied === m.id
                    ? <><Check className="w-3.5 h-3.5 mr-1" /> Copied</>
                    : <><Copy className="w-3.5 h-3.5 mr-1" /> Copy OTP</>}
                </Button>
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
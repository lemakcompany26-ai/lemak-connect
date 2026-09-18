import { useCallback, useEffect, useRef, useState } from 'react';
import { KeyRound, Loader2, MessageCircle, Send } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import TypingIndicator from '@/components/chat/TypingIndicator';

const TYPING_FRESH_MS = 6000;

// Private chat for a number rental. Sellers can flag a message as an OTP
// delivery — once an OTP is sent, the rental can no longer be cancelled.
export default function RentalChatDialog({ rental, role, onClose }) {
  const [messages, setMessages] = useState(null);
  const [draft, setDraft] = useState('');
  const [isOtp, setIsOtp] = useState(false);
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState({ buyer: null, seller: null });
  const [liveStatus, setLiveStatus] = useState(null);
  const [, setTick] = useState(0);
  const lastTypingPing = useRef(0);

  const load = useCallback(async () => {
    if (!rental) return;
    try {
      const res = await base44.functions.invoke('virtualNumbers', { action: 'messages', rentalId: rental.id });
      const d = res.data || res;
      setMessages(d.messages || []);
      const last = (d.messages || [])[((d.messages || []).length) - 1];
      if (last && last.senderRole !== role) {
        setTyping({ buyer: null, seller: null });
      }
    } catch (e) {
      setMessages([]);
    }
  }, [rental && rental.id, role]);

  useEffect(() => {
    if (!rental) return;
    setMessages(null);
    setDraft('');
    setIsOtp(false);
    setTyping({ buyer: rental.buyerTypingAt || null, seller: rental.sellerTypingAt || null });
    setLiveStatus(rental.status);
    load();
    if (rental.provider && rental.status === 'active') {
      base44.functions.invoke('virtualNumbers', { action: 'provider_check', rentalId: rental.id }).catch(() => {});
    }
    const unsubscribe = base44.entities.RentalMessage.subscribe((event) => {
      const d = event.data || {};
      if (d.rentalId === rental.id) load();
    });
    const unsubscribeRentals = base44.entities.NumberRental.subscribe((event) => {
      const d = event.data || {};
      if (d.id === rental.id) {
        setTyping({ buyer: d.buyerTypingAt || null, seller: d.sellerTypingAt || null });
        setLiveStatus(d.status || null);
      }
    });
    const ticker = setInterval(() => setTick(t => t + 1), 2000);
    return () => { unsubscribe(); unsubscribeRentals(); clearInterval(ticker); };
  }, [rental && rental.id]);

  // Ping "typing" while composing (throttled, fire-and-forget).
  const onDraftChange = (value) => {
    setDraft(value);
    if (value && rental && Date.now() - lastTypingPing.current > 2500) {
      lastTypingPing.current = Date.now();
      base44.functions.invoke('virtualNumbers', { action: 'typing', rentalId: rental.id }).catch(() => {});
    }
  };

  const send = async () => {
    const content = draft.trim();
    if (!content || !rental || sending) return;
    // Optimistic: the message appears instantly and is confirmed (or rolled
    // back) once the server responds.
    const optimisticId = `tmp-${Date.now()}`;
    const isOtpFlag = role === 'seller' ? isOtp : false;
    setMessages(prev => (prev || []).concat({
      id: optimisticId,
      senderRole: role,
      senderName: 'You',
      content,
      isOtp: isOtpFlag,
      created_date: new Date().toISOString(),
      _pending: true
    }));
    setDraft('');
    setIsOtp(false);
    setSending(true);
    try {
      await base44.functions.invoke('virtualNumbers', {
        action: 'send_message', rentalId: rental.id, content, isOtp: isOtpFlag
      });
      await load();
    } catch (e) {
      const d = e.response && e.response.data;
      setMessages(prev => (prev || []).filter(m => m.id !== optimisticId));
      setDraft(content);
      if (role === 'seller' && isOtpFlag) setIsOtp(true);
    } finally {
      setSending(false);
    }
  };

  if (!rental) return null;

  const status = liveStatus || rental.status;
  const otpDelivered = (messages || []).some(m => m.isOtp);

  return (
    <Dialog open={!!rental} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="bg-mk-card border-mk-border text-slate-100 max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading font-extrabold text-white flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-mk-blue" /> {rental.service} OTP chat
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-xs">
            Rental {rental.rentalRef} · private between buyer and seller. {status !== 'active' ? 'This rental has ended — chat is read-only.' : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="h-72 overflow-y-auto scrollbar-thin space-y-3 py-3 pr-1">
          {messages === null && (
            <div className="h-full flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-mk-blue" /></div>
          )}
          {messages && messages.length === 0 && (
            <div className="h-full flex items-center justify-center text-xs text-slate-500 text-center px-4">
              {role === 'seller'
                ? 'The buyer is waiting — paste the OTP code as soon as it arrives.'
                : rental.provider
                  ? 'Your OTP is being fetched from the provider — it will appear here automatically.'
                  : 'Waiting for the seller to send your OTP. You can also ask questions here.'}
            </div>
          )}
          {messages && messages.map(m => {
            const mine = m.senderRole === role;
            return (
              <div key={m.id} className={'flex ' + (mine ? 'justify-end' : 'justify-start') + (m._pending ? ' opacity-60' : '')}>
                <div className={'max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ' + (m.isOtp
                  ? 'bg-mk-brown text-white border border-mk-brown-soft/30 rounded-br-sm'
                  : mine ? 'bg-mk-blue text-white rounded-br-sm' : 'bg-mk-card2 text-slate-200 rounded-bl-sm')}>
                  {m.isOtp && (
                    <div className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 opacity-80 mb-0.5">
                      <KeyRound className="w-3 h-3" /> OTP
                    </div>
                  )}
                  <p className="whitespace-pre-wrap break-words font-mono select-all">{m.content}</p>
                  <div className="text-[10px] opacity-60 text-right mt-1">
                    {new Date(m.created_date).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <TypingIndicator
          visible={(() => {
            if (role === 'buyer' && rental.provider && status === 'active' && !otpDelivered) return true;
            const otherTypingAt = role === 'buyer' ? typing.seller : typing.buyer;
            return Boolean(otherTypingAt && Date.now() - new Date(otherTypingAt).getTime() < TYPING_FRESH_MS);
          })()}
        />

        {status === 'active' && (
          <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); send(); }}>
            <div className="flex gap-2">
              <Input
                value={draft}
                onChange={(e) => onDraftChange(e.target.value.slice(0, 1000))}
                placeholder={role === 'seller' ? 'Paste the OTP code…' : 'Type a message…'}
                className="bg-mk-card2 border-mk-border text-slate-100 h-11"
              />
              <Button type="submit" size="icon" className="h-11 w-11 bg-mk-blue hover:bg-mk-blue/90 text-white shrink-0" disabled={sending || !draft.trim()}>
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
            {role === 'seller' && (
              <div className="flex items-center gap-2">
                <Switch id="otp-toggle" checked={isOtp} onCheckedChange={setIsOtp} />
                <Label htmlFor="otp-toggle" className="text-xs text-slate-400 font-normal">
                  This message is an OTP (locks the rental — the buyer can no longer cancel)
                </Label>
              </div>
            )}
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
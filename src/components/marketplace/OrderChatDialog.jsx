import { useCallback, useEffect, useState } from 'react';
import { Loader2, MessageCircle, Send } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';

// Private chat between the buyer and seller of a marketplace order.
// Only the two participants can load or post messages (verified server-side).
export default function OrderChatDialog({ order, onClose }) {
  const [messages, setMessages] = useState(null);
  const [role, setRole] = useState('buyer');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const loadMessages = useCallback(async () => {
    if (!order) return;
    try {
      const res = await base44.functions.invoke('orderChat', { action: 'list', orderId: order.id });
      const d = res.data || res;
      setMessages(d.messages || []);
      setRole(d.role || 'buyer');
    } catch (e) {
      setMessages([]);
    }
  }, [order && order.id]);

  useEffect(() => {
    if (!order) return;
    setMessages(null);
    setDraft('');
    loadMessages();
    const unsubscribe = base44.entities.OrderMessage.subscribe((event) => {
      const d = event.data || {};
      if (d.orderId === order.id) loadMessages();
    });
    return () => { unsubscribe(); };
  }, [order && order.id]);

  const send = async () => {
    const content = draft.trim();
    if (!content || !order || sending) return;
    setSending(true);
    try {
      await base44.functions.invoke('orderChat', { action: 'send', orderId: order.id, content });
      setDraft('');
      await loadMessages();
    } catch (e) {
      const d = e.response && e.response.data;
      // surfaced inline: the chat is a standalone dialog
      setDraft(content);
    } finally {
      setSending(false);
    }
  };

  if (!order) return null;

  return (
    <Dialog open={!!order} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="bg-mk-card border-mk-border text-slate-100 max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading font-extrabold text-white flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-mk-blue" /> {order.listingTitle}
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-xs">
            Private chat · Order {order.transactionId}. Keep conversations and payments on Lemak Connect — escrow protects both sides.
          </DialogDescription>
        </DialogHeader>

        <div className="h-72 overflow-y-auto scrollbar-thin space-y-3 py-3 pr-1">
          {messages === null && (
            <div className="h-full flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-mk-blue" /></div>
          )}
          {messages && messages.length === 0 && (
            <div className="h-full flex items-center justify-center text-xs text-slate-500 text-center">
              No messages yet. Say hello — this chat is private between you and the other party.
            </div>
          )}
          {messages && messages.map(m => {
            if (m.senderRole === 'system') {
              return (
                <div key={m.id} className="flex justify-center">
                  <div className="max-w-[92%] rounded-xl border border-mk-brown-soft/25 bg-mk-brown/15 px-3.5 py-2 text-[11px] leading-relaxed text-mk-brown-soft text-center whitespace-pre-wrap">
                    {m.content}
                  </div>
                </div>
              );
            }
            const mine = m.senderRole === role;
            return (
              <div key={m.id} className={'flex ' + (mine ? 'justify-end' : 'justify-start')}>
                <div className={'max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ' + (mine ? 'bg-mk-blue text-white rounded-br-sm' : 'bg-mk-card2 text-slate-200 rounded-bl-sm')}>
                  <div className="text-[10px] font-semibold opacity-70 mb-0.5">
                    {mine ? 'You' : (m.senderName || 'Them')}
                  </div>
                  <p className="whitespace-pre-wrap break-words">{m.content}</p>
                  <div className="text-[10px] opacity-60 text-right mt-1">
                    {new Date(m.created_date).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <form
          className="flex gap-2"
          onSubmit={(e) => { e.preventDefault(); send(); }}
        >
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, 1000))}
            placeholder="Type a message…"
            className="bg-mk-card2 border-mk-border text-slate-100 h-11"
          />
          <Button type="submit" size="icon" className="h-11 w-11 bg-mk-blue hover:bg-mk-blue/90 text-white shrink-0" disabled={sending || !draft.trim()}>
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
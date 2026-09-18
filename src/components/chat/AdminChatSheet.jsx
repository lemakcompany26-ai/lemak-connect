import { useEffect, useRef, useState } from 'react';
import { Loader2, Mail, MessageCircle, Send, ShieldCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// Admin chat with instant auto-reply. Available to buyers and sellers from
// inside any order chat — the Lemak assistant answers immediately and the
// human team (email/WhatsApp) is one tap away.
export default function AdminChatSheet({ open, onClose, context }) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setMessages([{
      role: 'assistant',
      content: "Hi! You're through to Lemak Admin. Ask anything about your order and I'll reply right away — a human teammate follows up on email or WhatsApp if needed."
    }]);
    setDraft('');
  }, [open]);

  useEffect(() => {
    if (endRef.current) endRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async () => {
    const content = draft.trim();
    if (!content || loading) return;
    setDraft('');
    const history = [...messages, { role: 'user', content }];
    setMessages(history);
    setLoading(true);
    try {
      const res = await base44.functions.invoke('aiSupport', {
        messages: history.map(m => ({
          role: m.role,
          content: m.role === 'user' && context ? `${context}\n${m.content}` : m.content
        }))
      });
      const d = res.data || res;
      setMessages(prev => [...prev, { role: 'assistant', content: d.reply }]);
    } catch (e) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I hit a snag. Please email lemakcompany26@gmail.com or WhatsApp 09022143559 and our team will help you.'
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DrawerContent className="bg-mk-bg border-mk-border">
        <DrawerHeader className="pb-2 sm:pb-2 text-left">
          <DrawerTitle className="font-heading text-sm font-extrabold text-white uppercase tracking-wide flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-400" /> Lemak Admin Chat
          </DrawerTitle>
          <DrawerDescription className="text-[11px] text-slate-400">
            Instant auto-reply, 24/7{context ? ` · ${context}` : ''}.
          </DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-4 space-y-3">
          <div className="h-[45vh] overflow-y-auto scrollbar-thin space-y-3 pr-1">
            {messages.map((m, i) => (
              <div key={i} className={'flex ' + (m.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div className={'max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ' +
                  (m.role === 'user'
                    ? 'bg-mk-blue text-white rounded-br-sm'
                    : 'bg-amber-400/15 border border-amber-400/30 text-amber-100 rounded-bl-sm')}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm bg-amber-400/15 border border-amber-400/30 px-4 py-3 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-amber-400/60 animate-bounce" style={{ animationDelay: '120ms' }} />
                  <span className="w-2 h-2 rounded-full bg-amber-400/60 animate-bounce" style={{ animationDelay: '240ms' }} />
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); send(); }}>
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, 1000))}
              placeholder="Message the admin…"
              className="bg-mk-card2 border-mk-border text-slate-100 h-11"
            />
            <Button type="submit" size="icon" className="h-11 w-11 bg-amber-400 hover:bg-amber-300 text-slate-900 shrink-0" disabled={loading || !draft.trim()}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </form>

          <div className="grid grid-cols-2 gap-2">
            <a href="mailto:lemakcompany26@gmail.com" className="flex items-center justify-center gap-1.5 rounded-xl border border-mk-border bg-mk-card2 px-3 py-2.5 text-[11px] font-bold text-slate-300">
              <Mail className="w-3.5 h-3.5 text-amber-400" /> Email team
            </a>
            <a href="https://wa.me/2349022143559" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 rounded-xl border border-mk-border bg-mk-card2 px-3 py-2.5 text-[11px] font-bold text-slate-300">
              <MessageCircle className="w-3.5 h-3.5 text-emerald-400" /> WhatsApp
            </a>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
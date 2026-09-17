import { useEffect, useRef, useState } from 'react';
import { Send, Bot, Loader2, Mail, MessageCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const SUGGESTIONS = ['How do I fund my wallet?', 'What happens if a purchase fails?', 'Which networks are supported?', 'How do I become a seller?'];

export default function Support() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! I\'m Lemak AI Support 👋 Ask me anything about our services, wallet, promos or transactions.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current && endRef.current.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  const send = async (text) => {
    const content = (text !== undefined ? text : input).trim();
    if (!content || loading) return;
    setInput('');
    const next = [...messages, { role: 'user', content }];
    setMessages(next);
    setLoading(true);
    try {
      const res = await base44.functions.invoke('aiSupport', {
        messages: next.map(m => ({ role: m.role, content: m.content }))
      });
      const d = res.data || res;
      setMessages(prev => [...prev, { role: 'assistant', content: d.reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I hit a snag. Please email lemakcompany26@gmail.com or WhatsApp 09022143559 and our team will help you.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4 h-[calc(100vh-8rem)] flex flex-col">
      <div>
        <h1 className="font-heading text-2xl font-extrabold flex items-center gap-2.5"><Bot className="w-6 h-6 text-primary" /> Lemak AI Support</h1>
        <p className="text-sm text-muted-foreground mt-1">Instant answers, 24/7. Real humans one message away.</p>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin rounded-3xl border border-border bg-card p-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={'flex ' + (m.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div className={'max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ' +
              (m.role === 'user'
                ? 'rounded-br-md brand-gradient-soft text-white shadow-md'
                : 'rounded-bl-md bg-muted text-foreground')}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md bg-muted px-4 py-3 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '120ms' }} />
              <span className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '240ms' }} />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map(s => (
            <button key={s} onClick={() => send(s)} className="text-xs font-medium rounded-full border border-border bg-card px-3.5 py-2 hover:border-primary/40 hover:text-primary transition-colors">
              {s}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={e => { e.preventDefault(); send(); }} className="flex gap-2">
        <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Type your question…" className="h-12" />
        <Button type="submit" className="h-12 w-12 p-0" disabled={loading || !input.trim()} aria-label="Send">
          <Send className="w-4 h-4" />
        </Button>
      </form>

      <div className="grid grid-cols-2 gap-3 pb-2">
        <a href="mailto:lemakcompany26@gmail.com" className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-xs font-semibold hover:border-primary/40 transition-colors">
          <Mail className="w-4 h-4 text-primary" /> Email Support
        </a>
        <a href="https://wa.me/2349022143559" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-xs font-semibold hover:border-primary/40 transition-colors">
          <MessageCircle className="w-4 h-4 text-emerald-600" /> WhatsApp 0902 214 3559
        </a>
      </div>
    </div>
  );
}
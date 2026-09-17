import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, RotateCcw, Headset, Zap, Mail, Phone, MessageCircle } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';

const WHY = [
  { icon: Zap, title: 'Blazing fast', desc: 'Top-ups and bundles land in seconds — not minutes.' },
  { icon: ShieldCheck, title: 'Secure wallet', desc: 'Every naira movement is logged and reversible only by our secure backend.' },
  { icon: RotateCcw, title: 'Automatic refunds', desc: 'If a purchase fails, your wallet is refunded instantly. No tickets needed.' },
  { icon: Headset, title: 'Real human support', desc: 'AI answers in seconds; our team replies on email and WhatsApp.' }
];

const FAQS = [
  { q: 'How do I fund my wallet?', a: 'Open your wallet, enter an amount, and pay securely with your card via Paystack. Your balance updates as soon as payment is confirmed — never before.' },
  { q: 'What happens if a purchase fails?', a: 'Nothing is lost. If the provider cannot deliver, we refund your wallet automatically and send you a notification with the transaction reference.' },
  { q: 'Which networks are supported for airtime and data?', a: 'MTN, Airtel, Glo and 9mobile are supported, with real provider plan lists for data bundles.' },
  { q: 'Do you charge my card for every purchase?', a: 'No. You fund your wallet once, then every purchase deducts from your balance instantly.' },
  { q: 'How do I become a marketplace seller?', a: 'Submit a seller application from the app. Our team reviews it, and once approved you can create listings for buyers to order.' },
  { q: 'How can I reach support?', a: 'Email lemakcompany26@gmail.com, call or WhatsApp 09022143559, or chat with Lemak AI Support right inside the app.' }
];

export default function WhySection() {
  const [showAll, setShowAll] = useState(false);
  const visibleFaqs = showAll ? FAQS : FAQS.slice(0, 4);
  return (
    <>
      <section className="py-20 bg-muted/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto">
            <span className="inline-block rounded-full bg-primary/10 text-primary text-xs font-semibold px-4 py-1.5 uppercase tracking-wider">Why Lemak Connect</span>
            <h2 className="mt-4 font-heading text-3xl sm:text-4xl font-extrabold tracking-tight">Built for reliability, priced for Nigeria</h2>
          </div>
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {WHY.map((w, i) => (
              <div key={i} className="rounded-2xl bg-card border border-border p-6 shadow-sm">
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><w.icon className="w-5.5 h-5.5 w-6 h-6" /></div>
                <h3 className="mt-4 font-heading font-bold text-sm">{w.title}</h3>
                <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{w.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-background">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="text-center">
            <span className="inline-block rounded-full bg-primary/10 text-primary text-xs font-semibold px-4 py-1.5 uppercase tracking-wider">FAQ</span>
            <h2 className="mt-4 font-heading text-3xl font-extrabold tracking-tight">Questions, answered</h2>
          </div>
          <div className="mt-10">
            <Accordion type="single" collapsible className="rounded-2xl border border-border bg-card px-5 divide-y divide-border">
              {visibleFaqs.map((f, i) => (
                <AccordionItem key={i} value={`faq-${i}`} className="border-0">
                  <AccordionTrigger className="text-sm font-semibold py-4 hover:no-underline">{f.q}</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
            {!showAll && (
              <button onClick={() => setShowAll(true)} className="mt-4 w-full text-sm font-semibold text-primary py-2">
                Show more questions
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="pb-20 px-4 sm:px-6">
        <div className="mx-auto max-w-5xl rounded-3xl brand-gradient px-8 py-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 85% 15%, rgba(96,165,250,.6) 0%, transparent 40%)' }} />
          <div className="relative">
            <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-white">Need help? We're one message away.</h2>
            <p className="mt-3 text-white/70 text-sm max-w-md mx-auto">Our support team is available on email and WhatsApp — and inside the app, Lemak AI Support answers instantly.</p>
            <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
              <Button asChild size="lg" className="h-12 px-7 bg-white text-secondary hover:bg-blue-50">
                <a href="mailto:lemakcompany26@gmail.com"><Mail className="w-4 h-4 mr-2" /> Email Support</a>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 px-7 bg-transparent text-white border-white/30 hover:bg-white/10 hover:text-white">
                <a href="https://wa.me/2349022143559" target="_blank" rel="noreferrer"><MessageCircle className="w-4 h-4 mr-2" /> WhatsApp 0902 214 3559</a>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
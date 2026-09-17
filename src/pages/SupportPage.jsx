import { Link } from 'react-router-dom';
import { Mail, Phone, MessageCircle, Bot } from 'lucide-react';
import PublicNavbar from '@/components/public/PublicNavbar';
import PublicFooter from '@/components/public/PublicFooter';
import { Button } from '@/components/ui/button';

const CHANNELS = [
  { icon: Mail, title: 'Email Support', value: 'lemakcompany26@gmail.com', href: 'mailto:lemakcompany26@gmail.com', desc: 'Best for account and payment issues. We usually reply within a few hours.' },
  { icon: Phone, title: 'Phone / WhatsApp', value: '0902 214 3559', href: 'https://wa.me/2349022143559', desc: 'Chat with a real human on WhatsApp, any day of the week.' },
  { icon: Bot, title: 'Lemak AI Support', value: 'Inside the app', href: null, desc: 'Instant answers about services, pricing and how the wallet works — 24/7.' }
];

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />
      <main>
        <section className="brand-gradient py-16 md:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 text-center">
            <h1 className="font-heading text-3xl sm:text-5xl font-extrabold tracking-tight text-white">Support & Help Center</h1>
            <p className="mt-4 text-white/70 max-w-xl mx-auto">Stuck somewhere? Pick the fastest channel — we're always happy to help.</p>
          </div>
        </section>
        <section className="py-16 px-4 sm:px-6">
          <div className="mx-auto max-w-4xl grid md:grid-cols-3 gap-5">
            {CHANNELS.map((c, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col">
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><c.icon className="w-5 h-5" /></div>
                <h3 className="mt-4 font-heading font-bold text-sm">{c.title}</h3>
                <div className="mt-1 text-sm font-semibold text-primary">{c.value}</div>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed flex-1">{c.desc}</p>
                {c.href ? (
                  <Button asChild variant="outline" className="mt-4 h-10 text-xs font-semibold">
                    <a href={c.href} target={c.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer">Contact</a>
                  </Button>
                ) : (
                  <Button asChild variant="outline" className="mt-4 h-10 text-xs font-semibold">
                    <Link to="/register">Open App</Link>
                  </Button>
                )}
              </div>
            ))}
          </div>
          <div className="mx-auto max-w-4xl mt-10 rounded-2xl border border-border bg-muted/40 p-7">
            <h2 className="font-heading font-bold">Before you contact us</h2>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground list-disc pl-5">
              <li>Check your <Link to="/login" className="text-primary font-medium">transaction history</Link> — every purchase has a receipt with a reference (LMK-…).</li>
              <li>Failed purchases are refunded automatically — check your wallet balance first.</li>
              <li>Have your transaction reference ready; it makes everything faster.</li>
            </ul>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
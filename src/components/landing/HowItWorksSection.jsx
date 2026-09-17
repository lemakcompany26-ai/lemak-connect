import { UserPlus, Wallet, Zap } from 'lucide-react';

const STEPS = [
  { icon: UserPlus, title: 'Create your account', desc: 'Sign up with email or Google in under a minute. Your wallet is created automatically.' },
  { icon: Wallet, title: 'Fund your wallet', desc: 'Top up securely with your card via Paystack. Your balance is always in naira.' },
  { icon: Zap, title: 'Buy in seconds', desc: 'Pick any service, confirm, and it is delivered instantly — with a receipt for every purchase.' }
];

export default function HowItWorksSection() {
  return (
    <section className="py-20 bg-muted/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto">
          <span className="inline-block rounded-full bg-primary/10 text-primary text-xs font-semibold px-4 py-1.5 uppercase tracking-wider">How It Works</span>
          <h2 className="mt-4 font-heading text-3xl sm:text-4xl font-extrabold tracking-tight">Start buying in 3 simple steps</h2>
        </div>
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          {STEPS.map((step, i) => (
            <div key={i} className="relative rounded-2xl bg-card border border-border p-7 text-center shadow-sm">
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full brand-gradient-soft text-white font-heading font-extrabold flex items-center justify-center shadow-lg shadow-primary/30">
                {i + 1}
              </div>
              <div className="mt-4 w-14 h-14 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <step.icon className="w-7 h-7" />
              </div>
              <h3 className="mt-5 font-heading font-bold">{step.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
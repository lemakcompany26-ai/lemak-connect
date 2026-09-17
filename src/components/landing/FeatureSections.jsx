import { Link } from 'react-router-dom';
import { TrendingUp, Phone, Store, CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

function FeatureBlock({ eyebrow, title, desc, bullets, icon: Icon, mock, reverse }) {
  return (
    <div className={`grid md:grid-cols-2 gap-10 items-center ${reverse ? 'md:[direction:rtl]' : ''}`}>
      <div className="[direction:ltr]">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold px-3.5 py-1.5"><Icon className="w-3.5 h-3.5" /> {eyebrow}</span>
        <h3 className="mt-4 font-heading text-2xl sm:text-3xl font-extrabold tracking-tight">{title}</h3>
        <p className="mt-3 text-muted-foreground leading-relaxed">{desc}</p>
        <ul className="mt-5 space-y-2.5">
          {bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm">
              <CheckCircle2 className="w-4.5 h-4.5 w-5 h-5 text-primary shrink-0 mt-0.5" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="[direction:ltr]">{mock}</div>
    </div>
  );
}

export default function FeatureSections() {
  return (
    <section className="py-20 md:py-24 bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 space-y-20 md:space-y-24">

        <FeatureBlock
          eyebrow="Digital Growth"
          icon={TrendingUp}
          title="Grow your social media, the smart way"
          desc="Real engagement for your brand — likes, views and followers delivered from trusted providers, with order tracking and refills where supported."
          bullets={['Likes, views & followers for major platforms', 'Live order status and history', 'Transparent pricing, no fake promises']}
          mock={
            <div className="rounded-3xl brand-gradient p-6 shadow-xl shadow-primary/20">
              <div className="grid grid-cols-2 gap-3">
                {[['Likes', '2,500', '+38%'], ['Views', '18.2K', '+64%'], ['Followers', '840', '+12%'], ['Engagement', 'High', '▲']].map(([label, value, delta], i) => (
                  <div key={i} className="rounded-2xl bg-white/10 border border-white/15 p-4 backdrop-blur">
                    <div className="text-xs text-white/60 font-medium">{label}</div>
                    <div className="text-white text-xl font-extrabold mt-1">{value}</div>
                    <div className="text-[11px] text-emerald-300 font-semibold mt-0.5">{delta} this month</div>
                  </div>
                ))}
              </div>
            </div>
          }
        />

        <FeatureBlock
          reverse
          eyebrow="Virtual Numbers / OTP"
          icon={Phone}
          title="Verify anything with a virtual number"
          desc="Need an OTP for WhatsApp, Telegram or an app? Get a disposable virtual number, receive codes in a private chat-style inbox, and pay only for what works."
          bullets={['Country & service selection', 'Codes arrive in your private OTP inbox', 'Automatic refund when a number fails']}
          mock={
            <div className="rounded-3xl border border-border bg-card p-5 shadow-lg max-w-sm mx-auto space-y-3">
              <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-muted px-4 py-2.5 text-xs">Requesting your number…</div>
              <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-muted px-4 py-2.5 text-xs">Number assigned: +1 (415) •••-8842</div>
              <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-muted px-4 py-2.5 text-xs">Waiting for OTP<span className="inline-block ml-0.5 animate-pulse">…</span></div>
              <div className="max-w-[85%] rounded-2xl rounded-br-md brand-gradient-soft px-4 py-2.5 text-xs text-white shadow-md">Your verification code is 482913</div>
            </div>
          }
        />

        <FeatureBlock
          eyebrow="Marketplace"
          icon={Store}
          title="A marketplace you can trust"
          desc="Hire vetted freelancers and agencies for design, development, marketing and more. Your payment is held safely until you confirm delivery."
          bullets={['Sellers are verified before listing', 'Buyer money held in escrow until delivery', 'Fair platform fee, configurable by admin']}
          mock={
            <div className="rounded-3xl border border-border bg-card p-5 shadow-lg max-w-sm mx-auto space-y-3">
              {[['Logo Design — 3 concepts', '₦15,000'], ['Website Development', '₦120,000'], ['Social Media Management', '₦45,000 / mo']].map(([t, p], i) => (
                <div key={i} className="flex items-center justify-between rounded-2xl border border-border px-4 py-3.5">
                  <div className="text-xs font-semibold">{t}</div>
                  <div className="text-xs font-bold text-primary">{p}</div>
                </div>
              ))}
              <Button asChild variant="outline" className="w-full h-10 text-xs font-semibold">
                <Link to="/register">Become a Seller <ArrowRight className="w-3.5 h-3.5 ml-1.5" /></Link>
              </Button>
            </div>
          }
        />

      </div>
    </section>
  );
}
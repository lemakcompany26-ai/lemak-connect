import { Link } from 'react-router-dom';
import { Smartphone, Wifi, Lightbulb, Tv, Trophy, GraduationCap, Ticket, Globe, Phone, TrendingUp, BarChart3, Store } from 'lucide-react';

export const ALL_SERVICES = [
  { slug: 'airtime', name: 'Airtime', icon: Smartphone, desc: 'Instant top-ups for MTN, Airtel, Glo & 9mobile.', live: true },
  { slug: 'data', name: 'Data Bundles', icon: Wifi, desc: 'Real network bundles at unbeatable prices.', live: true },
  { slug: 'electricity', name: 'Electricity', icon: Lightbulb, desc: 'Prepaid & postpaid tokens for major discos.', live: false },
  { slug: 'cable', name: 'Cable TV', icon: Tv, desc: 'DStv, GOtv & StarTimes subscriptions.', live: false },
  { slug: 'betting', name: 'Betting', icon: Trophy, desc: 'Fund Bet9ja, SportyBet, 1xBet & more.', live: false },
  { slug: 'education', name: 'Education', icon: GraduationCap, desc: 'WAEC, JAMB & NECO result-checker pins.', live: false },
  { slug: 'epin', name: 'ePIN / Recharge', icon: Ticket, desc: 'Digital recharge pins, delivered instantly.', live: false },
  { slug: 'broadband', name: 'Broadband', icon: Globe, desc: 'Home & office internet subscriptions.', live: false },
  { slug: 'virtual-numbers', name: 'Virtual Numbers', icon: Phone, desc: 'OTP numbers for WhatsApp, Telegram & more.', live: false },
  { slug: 'social-growth', name: 'Social Growth', icon: TrendingUp, desc: 'Real likes, views & followers that stick.', live: false },
  { slug: 'analytics', name: 'Social Analytics', icon: BarChart3, desc: 'Track your orders & growth performance.', live: false },
  { slug: 'marketplace', name: 'Marketplace', icon: Store, desc: 'Buy & sell trusted digital services.', live: true }
];

export default function ServicesSection() {
  return (
    <section id="services" className="py-20 md:py-24 bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto">
          <span className="inline-block rounded-full bg-primary/10 text-primary text-xs font-semibold px-4 py-1.5 uppercase tracking-wider">Our Services</span>
          <h2 className="mt-4 font-heading text-3xl sm:text-4xl font-extrabold tracking-tight">One platform. Every digital service you need.</h2>
          <p className="mt-4 text-muted-foreground">Fund your wallet once and buy everything instantly — no card details every time.</p>
        </div>
        <div className="mt-12 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {ALL_SERVICES.map(s => (
            <div key={s.slug} className="group relative rounded-2xl border border-border bg-card p-5 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/30 transition-all duration-300">
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground text-primary transition-colors">
                <s.icon className="w-6 h-6" />
              </div>
              <h3 className="mt-4 font-heading font-bold text-sm">{s.name}</h3>
              <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
              {s.live && <span className="absolute top-3 right-3 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">Live</span>}
            </div>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link to="/register" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:gap-2.5 transition-all">
            Create a free account <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
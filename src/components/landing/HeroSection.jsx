import { Link } from 'react-router-dom';
import { ArrowRight, Smartphone, Zap, ShieldCheck, Wallet, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden brand-gradient">
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 pt-16 pb-20 md:pt-24 md:pb-28 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-4 py-1.5 text-xs font-medium text-white/90 backdrop-blur">
            <Zap className="w-3.5 h-3.5" /> Instant top-ups, 24/7
          </div>
          <h1 className="mt-6 font-heading text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white leading-[1.05]">
            Everything digital.
            <br />
            <span className="text-white">One wallet.</span>
          </h1>
          <p className="mt-6 text-base sm:text-lg text-white/70 max-w-lg leading-relaxed">
            Buy airtime and data, pay electricity and cable bills, fund betting wallets, get virtual numbers
            for OTPs, grow your social media and shop digital services — instantly, from one secure wallet.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Button asChild size="lg" className="h-12 px-7 text-sm font-semibold bg-white text-secondary hover:bg-blue-50 shadow-lg">
              <Link to="/register">Get Started <ArrowRight className="w-4 h-4 ml-1.5" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 px-7 text-sm font-semibold bg-transparent text-white border-white/30 hover:bg-white/10 hover:text-white">
              <Link to="/services">Explore Services</Link>
            </Button>
          </div>
          <div className="mt-10 grid grid-cols-3 gap-6 max-w-md">
            <div>
              <div className="flex items-center gap-1.5 text-white font-bold text-lg"><ShieldCheck className="w-4.5 h-4.5 w-5 h-5 text-blue-300" /> Secure</div>
              <p className="text-xs text-white/50 mt-1">Bank-grade wallet protection</p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-white font-bold text-lg"><Zap className="w-5 h-5 text-blue-300" /> Instant</div>
              <p className="text-xs text-white/50 mt-1">Delivered in seconds</p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-white font-bold text-lg"><Wallet className="w-5 h-5 text-blue-300" /> Refunds</div>
              <p className="text-xs text-white/50 mt-1">Automatic on failure</p>
            </div>
          </div>
        </div>

        <div className="hidden md:block relative">
          <div className="relative mx-auto w-[300px] rounded-[2rem] border-[10px] border-white/15 bg-white shadow-2xl overflow-hidden">
            <div className="brand-gradient px-5 py-4">
              <div className="text-[10px] uppercase tracking-wider text-white/60 font-semibold">Wallet Balance</div>
              <div className="text-white text-2xl font-extrabold mt-1">₦12,450.00</div>
            </div>
            <div className="p-4 space-y-2.5 bg-slate-50">
              {[
                { icon: Smartphone, label: 'MTN Airtime', sub: '0803 ••• 4521', amount: '₦500' },
                { icon: TrendingUp, label: 'Data Bundle', sub: 'Airtel • 2GB', amount: '₦650' },
                { icon: Zap, label: 'Electricity Token', sub: 'Prepaid meter', amount: '₦2,000' }
              ].map((row, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl bg-white p-3 border border-slate-100 shadow-sm">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                    <row.icon className="w-4.5 h-4.5 w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-slate-900 truncate">{row.label}</div>
                    <div className="text-[10px] text-slate-400">{row.sub}</div>
                  </div>
                  <div className="text-xs font-bold text-slate-900">{row.amount}</div>
                </div>
              ))}
              <div className="pt-1 text-center">
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                  <Zap className="w-3 h-3" /> Delivered instantly
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
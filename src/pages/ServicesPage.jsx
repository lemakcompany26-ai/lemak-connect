import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import PublicNavbar from '@/components/public/PublicNavbar';
import PublicFooter from '@/components/public/PublicFooter';
import ServicesSection, { ALL_SERVICES } from '@/components/landing/ServicesSection';
import { Button } from '@/components/ui/button';

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />
      <main>
        <section className="brand-gradient py-16 md:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 text-center">
            <h1 className="font-heading text-3xl sm:text-5xl font-extrabold tracking-tight text-white">Services</h1>
            <p className="mt-4 text-white/70 max-w-xl mx-auto">Browse everything Lemak Connect offers. Sign up once, fund your wallet, and buy any service instantly.</p>
            <Button asChild size="lg" className="mt-8 h-12 px-7 bg-white text-secondary hover:bg-blue-50 font-semibold">
              <Link to="/register">Create Free Account <ArrowRight className="w-4 h-4 ml-1.5" /></Link>
            </Button>
          </div>
        </section>
        <ServicesSection />
        <section className="pb-20 px-4 sm:px-6">
          <div className="mx-auto max-w-2xl rounded-2xl border border-primary/20 bg-primary/5 p-7 text-center">
            <h2 className="font-heading font-bold">Authentication required for purchases</h2>
            <p className="mt-2 text-sm text-muted-foreground">You can browse service information freely. To buy, you need a free account and a funded wallet.</p>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}

export function ServiceStatusList() {
  return (
    <div className="grid gap-2">
      {ALL_SERVICES.map(s => (
        <div key={s.slug} className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
          <span className="text-sm font-medium">{s.name}</span>
          {s.live
            ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600"><Check className="w-3.5 h-3.5" /> Available in app</span>
            : <span className="text-xs font-semibold text-muted-foreground">Launching soon</span>}
        </div>
      ))}
    </div>
  );
}
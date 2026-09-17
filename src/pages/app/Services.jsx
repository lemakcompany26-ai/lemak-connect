import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { ALL_SERVICES } from '@/components/landing/ServicesSection';
import { useApp } from '@/lib/AppContext';

const LIVE_ROUTES = {
  airtime: '/app/airtime',
  data: '/app/data',
  marketplace: '/app/marketplace',
  social_growth_placeholder: null
};

export default function Services() {
  const { profile } = useApp();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-extrabold">Services</h1>
        <p className="text-sm text-muted-foreground mt-1">Everything you can buy with your Lemak wallet.</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {ALL_SERVICES.map(s => {
          const to = LIVE_ROUTES[s.slug];
          const inner = (
            <>
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><s.icon className="w-5 h-5" /></div>
              <h3 className="mt-3 font-heading font-bold text-sm">{s.name}</h3>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
              <div className="mt-3 text-xs font-semibold text-primary inline-flex items-center gap-1">
                {to ? <>Buy now <ArrowRight className="w-3 h-3" /></> : <span className="text-muted-foreground">Launching soon</span>}
              </div>
            </>
          );
          const cls = 'block rounded-2xl border border-border bg-card p-5 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/30 transition-all' + (to ? '' : ' opacity-60 cursor-default');
          return to
            ? <Link key={s.slug} to={to} className={cls}>{inner}</Link>
            : <div key={s.slug} className={cls}>{inner}</div>;
        })}
      </div>
    </div>
  );
}
import PublicNavbar from '@/components/public/PublicNavbar';
import PublicFooter from '@/components/public/PublicFooter';
import HowItWorksSection from '@/components/landing/HowItWorksSection';

export default function HowItWorks() {
  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />
      <main>
        <section className="brand-gradient py-16 md:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 text-center">
            <h1 className="font-heading text-3xl sm:text-5xl font-extrabold tracking-tight text-white">How It Works</h1>
            <p className="mt-4 text-white/70 max-w-xl mx-auto">From sign-up to instant delivery in three steps. No cards saved, no hidden charges — just your Lemak wallet.</p>
          </div>
        </section>
        <HowItWorksSection />
        <section className="py-16 px-4 sm:px-6 bg-background">
          <div className="mx-auto max-w-2xl text-sm text-muted-foreground leading-relaxed border border-border rounded-2xl bg-card p-6">
            <p><b className="text-foreground">Every purchase is protected.</b> Prices are calculated server-side, promos are validated server-side, and failed purchases are refunded automatically to your wallet. You keep a receipt with a unique transaction reference for every naira you spend.</p>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
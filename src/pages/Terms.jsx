import PublicNavbar from '@/components/public/PublicNavbar';
import PublicFooter from '@/components/public/PublicFooter';
import { FileText } from 'lucide-react';

const SECTIONS = [
  {
    title: 'About these terms',
    body: 'These terms govern your use of Lemak Connect, a platform for digital services such as airtime, data, electricity, cable TV, betting top-ups, virtual numbers, social media growth and our service marketplace. By creating an account or using any service, you agree to these terms.'
  },
  {
    title: 'Your account',
    body: 'You must provide accurate information when signing up and keep your login details and security settings safe. You are responsible for activity carried out with your account.'
  },
  {
    title: 'Wallet and funding',
    body: 'Your Lemak Connect wallet is a prepaid balance used to pay for services. You can fund it through the payment options shown in the app, and your balance can be used for any service on the platform.'
  },
  {
    title: 'Purchases and pricing',
    body: 'Prices for each service are shown before you confirm a purchase and are locked in at the moment of payment. Every transaction receives a unique transaction ID, which appears on your confirmation screen and receipt.'
  },
  {
    title: 'Failed transactions and refunds',
    body: 'If a purchase fails after your wallet has been debited, the amount is automatically reversed to your wallet. Virtual number and marketplace orders follow the refund and escrow conditions shown on the order screen.'
  },
  {
    title: 'The marketplace',
    body: 'The marketplace connects buyers with independent sellers. When you purchase a listing, your payment is held safely until you confirm the service was delivered, after which the seller is paid and a platform fee is applied. Sellers are responsible for the quality and delivery of their own services.'
  },
  {
    title: 'Acceptable use',
    body: 'Do not use Lemak Connect for fraud, abuse, or any activity that breaks Nigerian law or the rules of the services we provide. We may refuse or reverse any transaction that violates these rules.'
  },
  {
    title: 'Account suspension',
    body: 'We may suspend or restrict an account if we detect suspicious activity, a security risk, or a breach of these terms. Where possible, we will notify you of the reason.'
  },
  {
    title: 'Changes to these terms',
    body: 'We may update these terms from time to time. The current version is always available on this page, and continued use of the platform means you accept the updated terms.'
  },
  {
    title: 'Contact us',
    body: 'Reach us any time at lemakcompany26@gmail.com or 09022143559.'
  }
];

export default function Terms() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicNavbar />
      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl brand-gradient-soft flex items-center justify-center shadow-md shadow-primary/30 shrink-0">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-heading text-2xl font-extrabold">Terms of Service</h1>
              <p className="text-sm text-muted-foreground">The rules for using Lemak Connect.</p>
            </div>
          </div>
          <div className="mt-8 space-y-4">
            {SECTIONS.map((s, i) => (
              <section key={i} className="rounded-2xl border border-border bg-card p-6">
                <h2 className="font-heading font-bold text-base">{i + 1}. {s.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.body}</p>
              </section>
            ))}
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
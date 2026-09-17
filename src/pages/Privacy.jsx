import PublicNavbar from '@/components/public/PublicNavbar';
import PublicFooter from '@/components/public/PublicFooter';
import { ShieldCheck } from 'lucide-react';

const SECTIONS = [
  {
    title: 'Overview',
    body: 'This policy explains what personal information Lemak Connect collects, how we use it, and the choices you have. It applies whenever you use our website or app.'
  },
  {
    title: 'Information we collect',
    body: 'We collect the details you give us when you sign up — your name, email address and phone number — plus the records of the transactions, orders and service requests you make on the platform.'
  },
  {
    title: 'How we use it',
    body: 'We use your information to run your account, deliver the services you purchase, send you receipts and service notifications, keep the platform secure, and respond when you contact support.'
  },
  {
    title: 'Payments',
    body: 'Card and bank payments are processed by our payment provider. Lemak Connect does not see or store your full card details.'
  },
  {
    title: 'Security features',
    body: 'Security codes such as your transaction PIN are stored only as secure, irreversible hashes — never in readable form. Biometric login uses your device\u2019s own biometric capability; your fingerprint or face data never leaves your device and is never stored by us.'
  },
  {
    title: 'Sharing your information',
    body: 'We only share the minimum information needed with the service providers that deliver your purchase — for example, the phone number when you buy airtime. We never sell your personal data.'
  },
  {
    title: 'Keeping your data safe',
    body: 'Access to your data is restricted, monitored and logged. Sensitive operations like payments, refunds and balance changes are validated on our secure backend before they are applied.'
  },
  {
    title: 'Your choices',
    body: 'You can request a copy of your data, ask us to correct it, or ask us to delete your account by contacting support. Deleting an account closes access to the platform and removes personal data we are not required to keep for records.'
  },
  {
    title: 'Changes to this policy',
    body: 'We may update this policy from time to time. The current version is always available on this page.'
  },
  {
    title: 'Contact us',
    body: 'Reach us any time at lemakcompany26@gmail.com or 09022143559.'
  }
];

export default function Privacy() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicNavbar />
      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl brand-gradient-soft flex items-center justify-center shadow-md shadow-primary/30 shrink-0">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-heading text-2xl font-extrabold">Privacy Policy</h1>
              <p className="text-sm text-muted-foreground">How Lemak Connect handles your information.</p>
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
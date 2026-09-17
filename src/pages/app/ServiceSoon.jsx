import { Clock } from 'lucide-react';

// Honest "launching soon" state for services not yet connected to a provider.
export default function ServiceSoon({ service }) {
  return (
    <div className="max-w-md mx-auto py-16 text-center">
      <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
        <Clock className="w-8 h-8 text-primary" />
      </div>
      <h1 className="mt-5 font-heading text-2xl font-extrabold">{service} is launching soon</h1>
      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
        We're connecting {service} to our provider network right now. It'll appear here — and in your services menu — the moment it goes live.
      </p>
      <p className="mt-4 text-xs text-muted-foreground">
        Questions? Email <span className="font-semibold text-foreground">lemakcompany26@gmail.com</span> or WhatsApp <span className="font-semibold text-foreground">09022143559</span>.
      </p>
    </div>
  );
}
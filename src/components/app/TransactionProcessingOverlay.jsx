import { useEffect, useState } from 'react';
import Logo from '@/components/Logo';

// Branded transaction-preparation animation, shown for the configured window
// BEFORE any provider request is made. Purely a frontend preparation screen.
export const PROCESSING_DURATION_MS = 15000;

export default function TransactionProcessingOverlay({ visible, duration = PROCESSING_DURATION_MS }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!visible) {
      setProgress(0);
      return;
    }
    const startedAt = Date.now();
    const timer = setInterval(() => {
      const pct = Math.min(100, ((Date.now() - startedAt) / duration) * 100);
      setProgress(pct);
      if (pct >= 100) clearInterval(timer);
    }, 100);
    return () => clearInterval(timer);
  }, [visible, duration]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 brand-gradient flex items-center justify-center" role="status" aria-live="polite">
      <div className="text-center px-6 animate-fade-in">
        <div className="pointer-events-none inline-block scale-[1.35]">
          <Logo light size="lg" />
        </div>
        <div className="mt-10 font-heading text-xl tracking-[0.2em] text-white/90 animate-pulse">proceeding</div>
        <div className="mt-8 mx-auto w-56 h-1.5 rounded-full bg-white/20 overflow-hidden">
          <div className="h-full bg-white rounded-full" style={{ width: `${progress}%`, transition: 'width 150ms linear' }} />
        </div>
        <div className="mt-4 text-xs text-white/50">Preparing your transaction…</div>
      </div>
    </div>
  );
}
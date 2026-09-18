import { useEffect, useState } from 'react';

// Branded transaction-preparation animation, shown for the configured window
// BEFORE any provider request is made. Purely a frontend preparation screen.
export const PROCESSING_DURATION_MS = 2500;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm" role="status" aria-live="polite">
      <div className="text-center px-6">
        <div className="mx-auto w-24 h-24 rounded-full brand-gradient flex items-center justify-center animate-pop-bounce shadow-2xl shadow-primary/40">
          <span className="font-heading text-5xl font-extrabold text-white leading-none">M</span>
        </div>
        <div className="mt-8 font-heading text-lg tracking-[0.25em] text-primary/80 uppercase animate-pulse">proceeding</div>
        <div className="mt-6 mx-auto w-56 h-1.5 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-primary rounded-full" style={{ width: `${progress}%`, transition: 'width 150ms linear' }} />
        </div>
        <div className="mt-3 text-xs text-muted-foreground">Preparing your transaction…</div>
      </div>
    </div>
  );
}
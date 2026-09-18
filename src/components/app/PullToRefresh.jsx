import { useEffect, useRef, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';

const THRESHOLD = 70;    // pull distance (px) that triggers a refresh
const MAX_PULL = 100;    // maximum visual pull distance
const RESISTANCE = 0.45; // rubber-band feel

// Gesture-based pull-to-refresh for window-scrolled app pages (WebView
// friendly). Automatically inactive on non-touch screens, so the desktop
// web experience is unchanged. Wrap the page content and pass onRefresh.
export default function PullToRefresh({ onRefresh, children }) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(null);
  const pullRef = useRef(0);
  const refreshingRef = useRef(false);
  const cbRef = useRef(onRefresh);
  cbRef.current = onRefresh;
  const enabled = typeof window !== 'undefined' && 'ontouchstart' in window;

  useEffect(() => {
    if (!enabled) return;
    const dialogOpen = () => !!document.querySelector('[role="dialog"][data-state="open"]');
    const atTop = () => window.scrollY <= 0;
    const onStart = (e) => {
      if (refreshingRef.current || dialogOpen() || !atTop()) return;
      startY.current = e.touches[0].clientY;
    };
    const onMove = (e) => {
      if (startY.current === null) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta <= 0) { pullRef.current = 0; setPull(0); return; }
      if (window.scrollY > 0 || dialogOpen()) { startY.current = null; pullRef.current = 0; setPull(0); return; }
      // keep the native WebView refresh/overscroll out of the way
      if (e.cancelable) e.preventDefault();
      pullRef.current = Math.min(MAX_PULL, delta * RESISTANCE);
      setPull(pullRef.current);
    };
    const onEnd = async () => {
      if (startY.current === null) return;
      startY.current = null;
      if (pullRef.current >= THRESHOLD && !refreshingRef.current) {
        refreshingRef.current = true;
        setRefreshing(true);
        try { await cbRef.current && cbRef.current(); } catch (e) { /* keep the page stable */ }
        refreshingRef.current = false;
        setRefreshing(false);
      }
      pullRef.current = 0;
      setPull(0);
    };
    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, [enabled]);

  const showIndicator = pull > 0 || refreshing;

  return (
    <div className="relative">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed top-14 left-1/2 z-50 flex items-center justify-center"
        style={{
          transform: `translate(-50%, ${(refreshing ? THRESHOLD * 0.8 : pull)}px)`,
          opacity: showIndicator ? 1 : 0,
          transition: startY.current === null ? 'transform 250ms ease-out, opacity 200ms' : 'none'
        }}
      >
        <div className="rounded-full bg-card border border-border shadow-md p-2.5">
          {refreshing
            ? <Loader2 className="w-5 h-5 text-primary animate-spin" />
            : <RefreshCw className="w-5 h-5 text-muted-foreground" style={{ transform: `rotate(${pull * 3}deg)` }} />}
        </div>
      </div>
      {children}
    </div>
  );
}
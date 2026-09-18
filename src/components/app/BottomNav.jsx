import { useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, LayoutGrid, Wallet, ReceiptText, UserCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { to: '/app', label: 'Home', icon: LayoutDashboard },
  { to: '/app/services', label: 'Services', icon: LayoutGrid },
  { to: '/app/transactions', label: 'Transactions', icon: ReceiptText },
  { to: '/app/wallet', label: 'Wallet', icon: Wallet },
  { to: '/app/profile', label: 'Profile', icon: UserCircle }
];

// Route prefixes owned by each tab (Home owns everything else under /app).
// Used to restore the last visited path when switching tabs and to mark the
// right tab active on sub-pages like /app/airtime.
const TAB_PREFIXES = {
  '/app/services': ['/app/services', '/app/airtime', '/app/data', '/app/electricity', '/app/cable', '/app/betting', '/app/education', '/app/epin', '/app/broadband', '/app/virtual-numbers', '/app/social-growth'],
  '/app/transactions': ['/app/transactions'],
  '/app/wallet': ['/app/wallet'],
  '/app/profile': ['/app/profile', '/app/settings']
};

export function getTabRootForPath(pathname) {
  if (!pathname.startsWith('/app')) return null;
  for (const [root, prefixes] of Object.entries(TAB_PREFIXES)) {
    if (prefixes.some(p => pathname === p || pathname.startsWith(p + '/'))) return root;
  }
  return '/app';
}

// Mobile-only bottom navigation. Replaces the slide-in side menu on phones;
// the desktop sidebar is untouched. Tapping a tab returns to the last path
// visited inside that tab; double-tapping the active tab resets to its root.
export default function BottomNav({ tabPaths = {} }) {
  const location = useLocation();
  const navigate = useNavigate();
  const lastTap = useRef(null);
  const activeRoot = getTabRootForPath(location.pathname);

  const handleTab = (tab) => {
    const now = Date.now();
    const isDoubleTap = !!lastTap.current && lastTap.current.tab === tab.to && now - lastTap.current.at < 500;
    lastTap.current = { tab: tab.to, at: now };
    if (activeRoot === tab.to) {
      if (isDoubleTap) navigate(tab.to);
      return;
    }
    navigate(tabPaths[tab.to] || tab.to);
  };

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur safe-bottom">
      <div className="flex items-stretch justify-around h-16">
        {TABS.map((tab) => {
          const active = activeRoot === tab.to;
          return (
            <button
              key={tab.to}
              type="button"
              onClick={() => handleTab(tab)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex flex-col items-center justify-center gap-1 flex-1 min-h-[44px] px-2 transition-colors',
                active ? 'text-primary font-semibold' : 'text-muted-foreground'
              )}
            >
              <tab.icon className="w-5 h-5" />
              <span className="text-[10px] leading-none">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, LayoutGrid, Wallet, ReceiptText, UserCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { to: '/app', label: 'Home', icon: LayoutDashboard },
  { to: '/app/services', label: 'Services', icon: LayoutGrid },
  { to: '/app/transactions', label: 'Transactions', icon: ReceiptText },
  { to: '/app/wallet', label: 'Wallet', icon: Wallet },
  { to: '/app/profile', label: 'Profile', icon: UserCircle }
];

// Mobile-only bottom navigation. Replaces the slide-in side menu on phones;
// the desktop sidebar is untouched.
export default function BottomNav() {
  const location = useLocation();
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur safe-bottom">
      <div className="flex items-stretch justify-around h-16">
        {TABS.map((tab) => {
          const active = tab.to === '/app' ? location.pathname === '/app' : location.pathname.startsWith(tab.to);
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={cn(
                'flex flex-col items-center justify-center gap-1 flex-1 min-h-[44px] px-2 transition-colors',
                active ? 'text-primary font-semibold' : 'text-muted-foreground'
              )}
            >
              <tab.icon className="w-5 h-5" />
              <span className="text-[10px] leading-none">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
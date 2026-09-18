import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Bell, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useApp } from '@/lib/AppContext';
import { AppProvider } from '@/lib/AppContext';
import { formatNairaShort } from '@/lib/format';
import Logo from '@/components/Logo';
import { APP_NAV, SERVICE_NAV, ACCOUNT_NAV, NavItem } from '@/components/app/NavItems';
import BottomNav, { getTabRootForPath } from '@/components/app/BottomNav';
import BiometricLock, { appLockEnabled } from '@/components/app/BiometricLock';

// Mobile sub-page header: bottom-nav tabs keep the plain logo; any nested
// sub-route gets a back arrow + page name so users are never trapped.
const BOTTOM_NAV_ROUTES = ['/app', '/app/services', '/app/wallet', '/app/transactions', '/app/profile'];
const ROUTE_TITLES = Object.fromEntries(
  [...APP_NAV, ...SERVICE_NAV, ...ACCOUNT_NAV].map(i => [i.to, i.label])
);
const DYNAMIC_TITLES = [
  ['/app/marketplace/listing/', 'Listing Details'],
  ['/app/virtual-numbers/order/', 'Virtual Number Order']
];

function getMobileSubPageTitle(pathname) {
  for (const [prefix, title] of DYNAMIC_TITLES) {
    if (pathname.startsWith(prefix)) return title;
  }
  if (BOTTOM_NAV_ROUTES.includes(pathname)) return '';
  return ROUTE_TITLES[pathname] || '';
}

function Sidebar({ onNavigate }) {
  const { logout } = useAuth();
  return (
    <div className="flex h-full flex-col bg-secondary">
      <div className="px-5 py-5 border-b border-white/10"><Logo light /></div>
      <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4 space-y-6">
        <div className="space-y-1">{APP_NAV.map(item => <NavItem key={item.to} item={item} onNavigate={onNavigate} />)}</div>
        <div>
          <div className="px-3.5 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-white/30">Buy Services</div>
          <div className="space-y-1">{SERVICE_NAV.map(item => <NavItem key={item.to} item={item} onNavigate={onNavigate} />)}</div>
        </div>
        <div>
          <div className="px-3.5 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-white/30">Account</div>
          <div className="space-y-1">{ACCOUNT_NAV.map(item => <NavItem key={item.to} item={item} onNavigate={onNavigate} />)}</div>
        </div>
      </nav>
      <div className="p-3 border-t border-white/10">
        <button onClick={() => logout('/login')} className="w-full flex items-center gap-3 rounded-xl px-3.5 h-11 text-sm text-white/80 hover:bg-white/10">
          <LogOut className="w-5 h-5" /> Sign out
        </button>
      </div>
    </div>
  );
}

function ShellInner() {
  const { refresh } = useApp();
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);
  const [locked, setLocked] = useState(appLockEnabled());
  const { wallet, profile } = useApp();
  const location = useLocation();
  const mobileTitle = getMobileSubPageTitle(location.pathname);

  // Per-tab path memory: the deepest path visited inside each bottom-nav
  // tab is stored, so switching tabs returns you where you left off.
  const [tabPaths, setTabPaths] = useState({});
  useEffect(() => {
    const root = getTabRootForPath(location.pathname);
    if (!root) return;
    setTabPaths(prev => (prev[root] === location.pathname ? prev : { ...prev, [root]: location.pathname }));
  }, [location.pathname]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const d = await refresh();
        if (!mounted) return;
        if (!d.profile) {
          navigate('/complete-profile', { replace: true });
        }
      } catch (e) {
        // stay — errors surface on individual pages
      } finally {
        if (mounted) setChecked(true);
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (!checked) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // Biometric app lock — fingerprint / Face ID before anything renders.
  if (locked) {
    return <BiometricLock onUnlocked={() => setLocked(false)} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-64 z-40">
        <Sidebar />
      </aside>
      <div className="lg:pl-64 flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 min-h-14 border-b border-border bg-background/80 backdrop-blur flex items-center gap-3 px-4 safe-top">
          <div className="lg:hidden flex items-center gap-1.5 min-w-0">
            {mobileTitle ? (
              <>
                <button
                  onClick={() => (window.history.state && window.history.state.idx > 0 ? navigate(-1) : navigate('/app'))}
                  aria-label="Go back"
                  className="p-1.5 -ml-1.5 rounded-lg hover:bg-muted shrink-0"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <span className="text-sm font-bold truncate">{mobileTitle}</span>
              </>
            ) : (
              <Logo />
            )}
          </div>
          <div className="flex-1" />
          <button
            onClick={() => navigate('/app/wallet')}
            className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 h-9 text-sm font-bold text-primary hover:bg-primary/10 transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            {formatNairaShort(wallet ? wallet.balance : 0)}
          </button>
          <button onClick={() => navigate('/app/notifications')} className="relative p-2 rounded-lg hover:bg-muted" aria-label="Notifications">
            <Bell className="w-5 h-5 text-muted-foreground" />
          </button>
          <div className="w-9 h-9 rounded-full brand-gradient-soft flex items-center justify-center text-white text-sm font-bold shrink-0">
            {(profile && profile.fullName ? profile.fullName[0] : '?').toUpperCase()}
          </div>
        </header>
        <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-6 pb-24 lg:pb-6">
          <Outlet />
        </main>
      </div>
      <BottomNav tabPaths={tabPaths} />
    </div>
  );
}

export default function AppShell() {
  return (
    <AppProvider>
      <ShellInner />
    </AppProvider>
  );
}
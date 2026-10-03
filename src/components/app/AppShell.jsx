import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LogOut,
  Bell,
  ArrowLeft,
  Shield,
  BriefcaseBusiness
} from 'lucide-react';

import { useAuth } from '@/lib/AuthContext';
import { useApp } from '@/lib/AppContext';
import { AppProvider } from '@/lib/AppContext';

import Logo from '@/components/Logo';

import {
  APP_NAV,
  SERVICE_NAV,
  ACCOUNT_NAV,
  ADMIN_NAV,
  isStaffProfile,
  NavItem
} from '@/components/app/NavItems';

import BottomNav, {
  getTabRootForPath
} from '@/components/app/BottomNav';

/* ==========================================================
   LEMAK EXPERT NAVIGATION ITEM
========================================================== */

const LEMAK_EXPERT_NAV = {
  to: '/app/lemak-expert-product',
  label: 'Lemak Expert',
  icon: BriefcaseBusiness
};

/* ==========================================================
   MOBILE ROUTES
========================================================== */

const BOTTOM_NAV_ROUTES = [
  '/app',
  '/app/services',
  '/app/wallet',
  '/app/transactions',
  '/app/profile'
];

const ROUTE_TITLES = Object.fromEntries(
  [
    ...APP_NAV,
    ...SERVICE_NAV,
    ...ACCOUNT_NAV,
    LEMAK_EXPERT_NAV
  ].map((item) => [
    item.to,
    item.label
  ])
);

const DYNAMIC_TITLES = [
  [
    '/app/marketplace/listing/',
    'Listing Details'
  ],
  [
    '/app/virtual-numbers/order/',
    'Virtual Number Order'
  ]
];

function getMobileSubPageTitle(pathname) {
  for (const [prefix, title] of DYNAMIC_TITLES) {
    if (pathname.startsWith(prefix)) {
      return title;
    }
  }

  if (BOTTOM_NAV_ROUTES.includes(pathname)) {
    return '';
  }

  return ROUTE_TITLES[pathname] || '';
}

/* ==========================================================
   SIDEBAR
========================================================== */

function Sidebar({
  onNavigate,
  isStaff
}) {
  const { logout } = useAuth();

  return (
    <div className="flex h-full flex-col bg-secondary">

      {/* LOGO */}

      <div className="px-5 py-5 border-b border-white/10">
        <Logo light />
      </div>

      {/* NAVIGATION */}

      <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4 space-y-6">

        {/* MAIN */}

        <div className="space-y-1">
          {APP_NAV.map((item) => (
            <NavItem
              key={item.to}
              item={item}
              onNavigate={onNavigate}
            />
          ))}
        </div>

        {/* BUY SERVICES */}

        <div>

          <div className="px-3.5 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-white/30">
            Buy Services
          </div>

          <div className="space-y-1">

            {SERVICE_NAV.map((item) => (
              <NavItem
                key={item.to}
                item={item}
                onNavigate={onNavigate}
              />
            ))}

            {/* =================================================
                LEMAK EXPERT
            ================================================= */}

            <NavItem
              item={LEMAK_EXPERT_NAV}
              onNavigate={onNavigate}
            />

          </div>
        </div>

        {/* ACCOUNT */}

        <div>

          <div className="px-3.5 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-white/30">
            Account
          </div>

          <div className="space-y-1">

            {ACCOUNT_NAV.map((item) => (
              <NavItem
                key={item.to}
                item={item}
                onNavigate={onNavigate}
              />
            ))}

          </div>
        </div>

        {/* MANAGEMENT */}

        {isStaff && (
          <div>

            <div className="px-3.5 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-white/30">
              Management
            </div>

            <div className="space-y-1">

              {ADMIN_NAV.map((item) => (
                <NavItem
                  key={item.to}
                  item={item}
                  onNavigate={onNavigate}
                />
              ))}

            </div>
          </div>
        )}

      </nav>

      {/* SIGN OUT */}

      <div className="p-3 border-t border-white/10">

        <button
          onClick={() => logout('/login')}
          className="w-full flex items-center gap-3 rounded-xl px-3.5 h-11 text-sm text-white/80 hover:bg-white/10"
        >
          <LogOut className="w-5 h-5" />

          Sign out
        </button>

      </div>

    </div>
  );
}

/* ==========================================================
   SHELL INNER
========================================================== */

function ShellInner() {
  const { refresh, profile } = useApp();

  const navigate = useNavigate();
  const location = useLocation();

  const [checked, setChecked] = useState(false);

  const mobileTitle =
    getMobileSubPageTitle(
      location.pathname
    );

  const isStaff =
    isStaffProfile(profile);

  /* ========================================================
     PER-TAB PATH MEMORY
  ======================================================== */

  const [tabPaths, setTabPaths] =
    useState({});

  useEffect(() => {
    const root =
      getTabRootForPath(
        location.pathname
      );

    if (!root) return;

    setTabPaths((previous) =>
      previous[root] === location.pathname
        ? previous
        : {
            ...previous,
            [root]: location.pathname
          }
    );
  }, [location.pathname]);

  /* ========================================================
     LOAD PROFILE
  ======================================================== */

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const d = await refresh();

        if (!mounted) return;

        if (!d?.profile) {
          navigate(
            '/complete-profile',
            {
              replace: true
            }
          );
        }
      } catch (e) {
        console.error(
          'App profile refresh error:',
          e
        );

        // Keep the user inside the app.
        // Individual pages can display their own errors.
      } finally {
        if (mounted) {
          setChecked(true);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [navigate, refresh]);

  /* ========================================================
     LOADING
  ======================================================== */

  if (!checked) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  /* ========================================================
     UI
  ======================================================== */

  return (
    <div className="min-h-screen bg-background">

      {/* ====================================================
          DESKTOP SIDEBAR
      ==================================================== */}

      <aside className="hidden lg:block fixed inset-y-0 left-0 w-64 z-40">

        <Sidebar
          onNavigate={() => {}}
          isStaff={isStaff}
        />

      </aside>

      {/* ====================================================
          MAIN CONTENT
      ==================================================== */}

      <div className="lg:pl-64 flex flex-col min-h-screen">

        {/* ==================================================
            MOBILE HEADER
        ================================================== */}

        <header className="sticky top-0 z-30 min-h-14 border-b border-border bg-background/80 backdrop-blur flex items-center gap-3 px-4 safe-top">

          <div className="lg:hidden flex items-center gap-1.5 min-w-0">

            {mobileTitle ? (
              <>
                <button
                  onClick={() => {
                    if (
                      window.history.state &&
                      window.history.state.idx > 0
                    ) {
                      navigate(-1);
                    } else {
                      navigate('/app');
                    }
                  }}
                  aria-label="Go back"
                  className="p-1.5 -ml-1.5 rounded-lg hover:bg-muted shrink-0"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <span className="text-sm font-bold truncate">
                  {mobileTitle}
                </span>
              </>
            ) : (
              <Logo />
            )}

          </div>

          <div className="flex-1" />

          {/* ADMIN BUTTON */}

          {isStaff && (
            <button
              onClick={() =>
                navigate('/admin')
              }
              className="p-2 rounded-lg hover:bg-muted"
              aria-label="Admin Dashboard"
              title="Admin Dashboard"
            >
              <Shield className="w-5 h-5 text-primary" />
            </button>
          )}

          {/* NOTIFICATIONS */}

          <button
            onClick={() =>
              navigate(
                '/app/notifications'
              )
            }
            className="relative p-2 rounded-lg hover:bg-muted"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5 text-muted-foreground" />
          </button>

          {/* PROFILE */}

          <button
            onClick={() =>
              navigate('/app/profile')
            }
            aria-label="Profile"
            className="w-9 h-9 rounded-full brand-gradient-soft flex items-center justify-center text-white text-sm font-bold shrink-0"
          >
            {(
              profile?.fullName
                ? profile.fullName[0]
                : '?'
            ).toUpperCase()}
          </button>

        </header>

        {/* ==================================================
            PAGE CONTENT
        ================================================== */}

        <main className="safe-inline flex-1 mx-auto w-full max-w-5xl px-4 py-6 pb-24 lg:pb-6">
          <Outlet />
        </main>

      </div>

      {/* ====================================================
          MOBILE BOTTOM NAV
      ==================================================== */}

      <BottomNav
        tabPaths={tabPaths}
      />

    </div>
  );
}

/* ==========================================================
   APP SHELL
========================================================== */

export default function AppShell() {
  return (
    <AppProvider>
      <ShellInner />
    </AppProvider>
  );
}

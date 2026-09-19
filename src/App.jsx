import { Suspense, lazy, useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import { GADS_CONVERSION_ID } from '@/lib/ads';
import AppShell from '@/components/app/AppShell';
import AdminShell from '@/components/admin/AdminShell';

// Pages are lazy-loaded (React.lazy + Suspense) so each route ships as its
// own chunk — faster startup inside mobile WebViews. Layout/auth wrappers
// stay eager so the shell paints instantly.
// Add page lazy imports here
const PageNotFound = lazy(() => import('./lib/PageNotFound'));
const Terms = lazy(() => import('@/pages/Terms'));
const Privacy = lazy(() => import('@/pages/Privacy'));
const Login = lazy(() => import('@/pages/Login'));
const Register = lazy(() => import('@/pages/Register'));
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/ResetPassword'));
const OAuthConsent = lazy(() => import('@/pages/OAuthConsent'));
const CompleteProfile = lazy(() => import('@/pages/app/CompleteProfile'));
const Dashboard = lazy(() => import('@/pages/app/Dashboard'));
const AppServices = lazy(() => import('@/pages/app/Services'));
const Airtime = lazy(() => import('@/pages/app/Airtime'));
const Data = lazy(() => import('@/pages/app/Data'));
const Cable = lazy(() => import('@/pages/app/Cable'));
const Betting = lazy(() => import('@/pages/app/Betting'));
const Epin = lazy(() => import('@/pages/app/Epin'));
const SocialGrowth = lazy(() => import('@/pages/app/SocialGrowth'));
const ServiceSoon = lazy(() => import('@/pages/app/ServiceSoon'));
const VirtualNumbers = lazy(() => import('@/pages/app/VirtualNumbers'));
const VirtualNumberOrder = lazy(() => import('@/pages/app/VirtualNumberOrder'));
const WalletPage = lazy(() => import('@/pages/app/Wallet'));
const Transactions = lazy(() => import('@/pages/app/Transactions'));
const Notifications = lazy(() => import('@/pages/app/Notifications'));
const AppSupport = lazy(() => import('@/pages/app/Support'));
const Profile = lazy(() => import('@/pages/app/Profile'));
const AppSettings = lazy(() => import('@/pages/app/Settings'));
const Marketplace = lazy(() => import('@/pages/app/Marketplace'));
const ListingDetail = lazy(() => import('@/pages/app/ListingDetail'));
const AppAnalytics = lazy(() => import('@/pages/app/Analytics'));
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'));
const AdminUsers = lazy(() => import('@/pages/admin/AdminUsers'));
const AdminTransactions = lazy(() => import('@/pages/admin/AdminTransactions'));
const AdminPricing = lazy(() => import('@/pages/admin/AdminPricing'));
const AdminPromos = lazy(() => import('@/pages/admin/AdminPromos'));
const AdminMarketplace = lazy(() => import('@/pages/admin/AdminMarketplace'));
const AdminVirtualNumbers = lazy(() => import('@/pages/admin/AdminVirtualNumbers'));
const AdminSettings = lazy(() => import('@/pages/admin/AdminSettings'));
const AdminSystemHealth = lazy(() => import('@/pages/admin/AdminSystemHealth'));
const AdminProfitCalculator = lazy(() => import('@/pages/admin/AdminProfitCalculator'));

const RouteFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
  </div>
);

// Entry point: authenticated users go straight to the app; everyone else
// lands on Login. There is no public landing page.
const EntryRedirect = () => {
  const { user } = useAuth();
  return <Navigate to={user ? '/app' : '/login'} replace />;
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin, user } = useAuth();

  // Google Ads SIGNUP conversion: Base44 signups finish off the app's own
  // pages and land back authenticated, so fire on the first authenticated
  // render — once, and only for brand-new accounts.
  useEffect(() => {
    if (typeof window === 'undefined' || !user || !user.id) return;
    // brand-new signup, not a returning login: created_date within the
    // delayed OTP/resend window (Google/social signups are near-instant)
    const createdDate = String(user.created_date || '');
    const createdDateUtc = /(?:Z|[+-]\d{2}:?\d{2})$/.test(createdDate)
      ? createdDate
      : createdDate + 'Z';
    const createdAtMs = Date.parse(createdDateUtc);
    const isNewSignup = Number.isFinite(createdAtMs) &&
      Date.now() - createdAtMs < 24 * 60 * 60 * 1000;
    const key = '_aw_signup_fired_AW-18458743728/q8gECLiox_scELCn6OFE_' + user.id;
    if (!isNewSignup || localStorage.getItem(key)) return;
    // gtag may not exist yet (the bootstrap effect in App runs later), so
    // retry briefly rather than skipping for good
    let tries = 0;
    const fire = () => {
      if (!window.gtag) { if (tries++ < 20) setTimeout(fire, 250); return; }
      // re-check inside the callback: a remount can start a second retry
      // loop that also passed the guard before gtag existed
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, '1');
      window.gtag('event', 'conversion', {
        send_to: 'AW-18458743728/q8gECLiox_scELCn6OFE',
        transaction_id: user.id,
      });
    };
    fire();
  }, [user]);

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Suspense fallback={<RouteFallback />}>
    <Routes>
      {/* Login-first: no public landing page. Terms/Privacy stay public for
          compliance links. */}
      <Route path="/" element={<EntryRedirect />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />

      {/* Auth routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/oauth/consent" element={<OAuthConsent />} />

      {/* Authenticated routes */}
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route path="/complete-profile" element={<CompleteProfile />} />
        <Route element={<AppShell />}>
          <Route path="/app" element={<Dashboard />} />
          <Route path="/app/services" element={<AppServices />} />
          <Route path="/app/airtime" element={<Airtime />} />
          <Route path="/app/data" element={<Data />} />
          <Route path="/app/electricity" element={<ServiceSoon service="Electricity" />} />
          <Route path="/app/cable" element={<Cable />} />
          <Route path="/app/betting" element={<Betting />} />
          <Route path="/app/education" element={<ServiceSoon service="Education" />} />
          <Route path="/app/epin" element={<Epin />} />
          <Route path="/app/broadband" element={<ServiceSoon service="Broadband" />} />
          <Route path="/app/virtual-numbers" element={<VirtualNumbers />} />
          <Route path="/app/virtual-numbers/order/:orderId" element={<VirtualNumberOrder />} />
          <Route path="/app/social-growth" element={<SocialGrowth />} />
          <Route path="/app/wallet" element={<WalletPage />} />
          <Route path="/app/transactions" element={<Transactions />} />
          <Route path="/app/notifications" element={<Notifications />} />
          <Route path="/app/support" element={<AppSupport />} />
          <Route path="/app/profile" element={<Profile />} />
          <Route path="/app/settings" element={<AppSettings />} />
          <Route path="/app/marketplace" element={<Marketplace />} />
          <Route path="/app/marketplace/listing/:listingId" element={<ListingDetail />} />
          <Route path="/app/analytics" element={<AppAnalytics />} />
        </Route>
        <Route element={<AdminShell />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/transactions" element={<AdminTransactions />} />
          <Route path="/admin/pricing" element={<AdminPricing />} />
          <Route path="/admin/promos" element={<AdminPromos />} />
          <Route path="/admin/marketplace" element={<AdminMarketplace />} />
          <Route path="/admin/virtual-numbers" element={<AdminVirtualNumbers />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
          <Route path="/admin/system-health" element={<AdminSystemHealth />} />
          <Route path="/admin/profit-calculator" element={<AdminProfitCalculator />} />
        </Route>
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
    </Suspense>
  );
};


function App() {
  // Google Ads gtag bootstrap — loaded once, shared by all conversions.
  // No page views are sent; only conversion events fire.
  useEffect(() => {
    if (typeof window === 'undefined' || window.__gads_loaded) return;
    window.__gads_loaded = true;
    window.dataLayer = window.dataLayer || [];
    const inIframe = (() => { try { return window.self !== window.top; } catch { return true; } })();
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
      if (inIframe) {
        try {
          const args = Array.prototype.slice.call(arguments);
          const cmd = args[0];
          window.parent.postMessage({
            type: 'base44_gtag_event',
            event: {
              source: 'gtag',
              timestamp: new Date().toLocaleTimeString(),
              command: cmd,
              params: args.slice(1),
              type: cmd === 'event' ? (args[1] || 'event') : cmd,
            },
          }, '*');
        } catch (_e) { /* relay must not break gtag */ }
      }
    };
    const s = document.createElement('script');
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GADS_CONVERSION_ID;
    s.async = true;
    document.head.appendChild(s);
    window.gtag('js', new Date());
    window.gtag('config', GADS_CONVERSION_ID, { send_page_view: false });
  }, []);

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
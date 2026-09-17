import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
// Add page imports here
import Landing from '@/pages/Landing';
import ServicesPage from '@/pages/ServicesPage';
import HowItWorks from '@/pages/HowItWorks';
import MarketplacePublic from '@/pages/MarketplacePublic';
import SupportPage from '@/pages/SupportPage';
import Terms from '@/pages/Terms';
import Privacy from '@/pages/Privacy';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppShell from '@/components/app/AppShell';
import AdminShell from '@/components/admin/AdminShell';
import CompleteProfile from '@/pages/app/CompleteProfile';
import Dashboard from '@/pages/app/Dashboard';
import AppServices from '@/pages/app/Services';
import Airtime from '@/pages/app/Airtime';
import Data from '@/pages/app/Data';
import ServiceSoon from '@/pages/app/ServiceSoon';
import VirtualNumbers from '@/pages/app/VirtualNumbers';
import WalletPage from '@/pages/app/Wallet';
import Transactions from '@/pages/app/Transactions';
import Notifications from '@/pages/app/Notifications';
import AppSupport from '@/pages/app/Support';
import Profile from '@/pages/app/Profile';
import AppSettings from '@/pages/app/Settings';
import Marketplace from '@/pages/app/Marketplace';
import AppAnalytics from '@/pages/app/Analytics';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminUsers from '@/pages/admin/AdminUsers';
import AdminTransactions from '@/pages/admin/AdminTransactions';
import AdminPricing from '@/pages/admin/AdminPricing';
import AdminPromos from '@/pages/admin/AdminPromos';
import AdminMarketplace from '@/pages/admin/AdminMarketplace';
import AdminSettings from '@/pages/admin/AdminSettings';
import AdminSystemHealth from '@/pages/admin/AdminSystemHealth';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

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
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Landing />} />
      <Route path="/services" element={<ServicesPage />} />
      <Route path="/how-it-works" element={<HowItWorks />} />
      <Route path="/marketplace" element={<MarketplacePublic />} />
      <Route path="/support" element={<SupportPage />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />

      {/* Auth routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Authenticated routes */}
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route path="/complete-profile" element={<CompleteProfile />} />
        <Route element={<AppShell />}>
          <Route path="/app" element={<Dashboard />} />
          <Route path="/app/services" element={<AppServices />} />
          <Route path="/app/airtime" element={<Airtime />} />
          <Route path="/app/data" element={<Data />} />
          <Route path="/app/electricity" element={<ServiceSoon service="Electricity" />} />
          <Route path="/app/cable" element={<ServiceSoon service="Cable TV" />} />
          <Route path="/app/betting" element={<ServiceSoon service="Betting" />} />
          <Route path="/app/education" element={<ServiceSoon service="Education" />} />
          <Route path="/app/epin" element={<ServiceSoon service="ePIN / Recharge" />} />
          <Route path="/app/broadband" element={<ServiceSoon service="Broadband" />} />
          <Route path="/app/virtual-numbers" element={<VirtualNumbers />} />
          <Route path="/app/social-growth" element={<ServiceSoon service="Social Growth" />} />
          <Route path="/app/wallet" element={<WalletPage />} />
          <Route path="/app/transactions" element={<Transactions />} />
          <Route path="/app/notifications" element={<Notifications />} />
          <Route path="/app/support" element={<AppSupport />} />
          <Route path="/app/profile" element={<Profile />} />
          <Route path="/app/settings" element={<AppSettings />} />
          <Route path="/app/marketplace" element={<Marketplace />} />
          <Route path="/app/analytics" element={<AppAnalytics />} />
        </Route>
        <Route element={<AdminShell />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/transactions" element={<AdminTransactions />} />
          <Route path="/admin/pricing" element={<AdminPricing />} />
          <Route path="/admin/promos" element={<AdminPromos />} />
          <Route path="/admin/marketplace" element={<AdminMarketplace />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
          <Route path="/admin/system-health" element={<AdminSystemHealth />} />
        </Route>
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

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
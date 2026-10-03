import { Suspense, lazy, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";

import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
  useLocation,
} from "react-router-dom";

import { AuthProvider, useAuth } from "@/lib/AuthContext";
import ScrollToTop from "@/components/ScrollToTop";
import ProtectedRoute from "@/components/ProtectedRoute";
import { GADS_CONVERSION_ID } from "@/lib/ads";

import AppShell from "@/components/app/AppShell";
import AdminShell from "@/components/admin/AdminShell";

import Landing from "./pages/Landing.jsx";
import Events from "./pages/Events";
import EventDetails from "./pages/EventsDetails";
import AdminEvents from "./pages/admin/AdminEvents";

// --------------------------------------------------
// Lazy loaded public pages
// --------------------------------------------------

const PageNotFound = lazy(() => import("./pages/PageNotFound"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));

const Login = lazy(() => import("./pages/auth/Login"));
const Register = lazy(() => import("./pages/auth/Register"));
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/auth/ResetPassword"));
const OAuthConsent = lazy(() => import("./pages/auth/OAuthConsent"));

// --------------------------------------------------
// User app pages
// --------------------------------------------------

const CompleteProfile = lazy(() =>
  import("@/pages/app/CompleteProfile")
);

const Dashboard = lazy(() =>
  import("@/pages/app/Dashboard")
);

const Services = lazy(() =>
  import("@/pages/app/Services")
);

const Airtime = lazy(() =>
  import("@/pages/app/Airtime")
);

const Data = lazy(() =>
  import("@/pages/app/Data")
);

const Cable = lazy(() =>
  import("@/pages/app/Cable")
);

const Betting = lazy(() =>
  import("@/pages/app/Betting")
);

const Epin = lazy(() =>
  import("@/pages/app/Epin")
);

const Electricity = lazy(() =>
  import("@/pages/app/Electricity")
);

const Education = lazy(() =>
  import("@/pages/app/Education")
);

const Broadband = lazy(() =>
  import("@/pages/app/Broadband")
);

const SocialGrowth = lazy(() =>
  import("@/pages/app/SocialGrowth")
);

const VirtualNumbers = lazy(() =>
  import("@/pages/app/VirtualNumbers")
);

const VirtualNumberOrder = lazy(() =>
  import("@/pages/app/VirtualNumberOrder")
);

const Wallet = lazy(() =>
  import("@/pages/app/Wallet")
);

const Transactions = lazy(() =>
  import("@/pages/app/Transactions")
);

const Notifications = lazy(() =>
  import("@/pages/app/Notifications")
);

const Support = lazy(() =>
  import("@/pages/app/Support")
);

const Profile = lazy(() =>
  import("@/pages/app/Profile")
);

const Settings = lazy(() =>
  import("@/pages/app/Settings")
);

const Referrals = lazy(() =>
  import("@/pages/app/Referrals")
);

const Marketplace = lazy(() =>
  import("@/pages/app/Marketplace")
);

const ListingDetail = lazy(() =>
  import("@/pages/app/ListingDetail")
);

const Analytics = lazy(() =>
  import("@/pages/app/Analytics")
);

const LemakExpertProduct = lazy(() =>
  import("@/pages/app/lemak-expert-product")
);

// --------------------------------------------------
// Admin pages
// --------------------------------------------------

const AdminDashboard = lazy(() =>
  import("@/pages/admin/AdminDashboard")
);

const AdminUsers = lazy(() =>
  import("@/pages/admin/AdminUsers")
);

const AdminTransactions = lazy(() =>
  import("@/pages/admin/AdminTransactions")
);

const AdminPricing = lazy(() =>
  import("@/pages/admin/AdminPricing")
);

const AdminPromos = lazy(() =>
  import("@/pages/admin/AdminPromos")
);

const AdminMarketplace = lazy(() =>
  import("@/pages/admin/AdminMarketplace")
);

const AdminVirtualNumbers = lazy(() =>
  import("@/pages/admin/AdminVirtualNumbers")
);

const AdminSettings = lazy(() =>
  import("@/pages/admin/AdminSettings")
);

const AdminSystemHealth = lazy(() =>
  import("@/pages/admin/AdminSystemHealth")
);

const AdminProfitCalculator = lazy(() =>
  import("@/pages/admin/AdminProfitCalculator")
);

const LemakExpertProductManagement = lazy(() =>
  import("@/pages/admin/LemakExpertProductManagement")
);

// --------------------------------------------------
// Loading fallback
// --------------------------------------------------

function RouteFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4" />

        <p className="text-sm text-muted-foreground">
          Loading...
        </p>
      </div>
    </div>
  );
}

// --------------------------------------------------
// Public paths
// --------------------------------------------------

const PUBLIC_PATHS = [
  "/",
  "/terms",
  "/privacy",
  "/login",
  "/register",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/oauth/consent",
  "/events",
];

// --------------------------------------------------
// Authenticated application
// --------------------------------------------------

function AuthenticatedApp() {
  const {
    user,
    isAuthenticated,
    isLoadingAuth,
    authError,
  } = useAuth();

  const location = useLocation();

  // ------------------------------------------------
  // Google Ads / Analytics
  // ------------------------------------------------

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!GADS_CONVERSION_ID) {
      return;
    }

    if (!window.gtag) {
      window.gtag = function () {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push(arguments);
      };
    }

    window.gtag(
      "config",
      GADS_CONVERSION_ID
    );
  }, []);

  // ------------------------------------------------
  // Wait for authentication state
  // ------------------------------------------------

  if (isLoadingAuth) {
    return <RouteFallback />;
  }

  // ------------------------------------------------
  // User is not registered
  // ------------------------------------------------

  if (
    authError?.type ===
    "user_not_registered"
  ) {
    return (
      <Navigate
        to="/register"
        replace
      />
    );
  }

  // ------------------------------------------------
  // Determine if current route is public
  // ------------------------------------------------

  const isPublicPath =
    PUBLIC_PATHS.some((path) => {
      if (path === "/") {
        return location.pathname === "/";
      }

      return (
        location.pathname === path ||
        location.pathname.startsWith(
          `${path}/`
        )
      );
    });

  // ------------------------------------------------
  // Block protected pages when logged out
  // ------------------------------------------------

  if (
    !user &&
    !isAuthenticated &&
    !isPublicPath
  ) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>

        {/* ==========================================
            PUBLIC ROUTES
        ========================================== */}

        <Route
          path="/"
          element={<Landing />}
        />

        <Route
          path="/terms"
          element={<Terms />}
        />

        <Route
          path="/privacy"
          element={<Privacy />}
        />

        {/* Login */}

        <Route
          path="/login"
          element={
            user ? (
              <Navigate
                to="/app"
                replace
              />
            ) : (
              <Login />
            )
          }
        />

        {/* Register */}

        <Route
          path="/register"
          element={
            user ? (
              <Navigate
                to="/app"
                replace
              />
            ) : (
              <Register />
            )
          }
        />

        <Route
          path="/signup"
          element={
            user ? (
              <Navigate
                to="/app"
                replace
              />
            ) : (
              <Register />
            )
          }
        />

        {/* Password */}

        <Route
          path="/forgot-password"
          element={<ForgotPassword />}
        />

        <Route
          path="/reset-password"
          element={<ResetPassword />}
        />

        {/* OAuth */}

        <Route
          path="/oauth/consent"
          element={<OAuthConsent />}
        />

        {/* Events */}

        <Route
          path="/events"
          element={<Events />}
        />

        <Route
          path="/events/:eventId"
          element={<EventDetails />}
        />

        {/* ==========================================
            DASHBOARD ALIAS
            /dashboard -> /app
        ========================================== */}

        <Route
          path="/dashboard"
          element={
            <Navigate
              to="/app"
              replace
            />
          }
        />

        {/* ==========================================
            PROTECTED APPLICATION
        ========================================== */}

        <Route
          element={
            <ProtectedRoute
              unauthenticatedElement={
                <Navigate
                  to="/login"
                  replace
                />
              }
            />
          }
        >

          {/* ========================================
              USER APP
          ======================================== */}

          <Route
            path="/app"
            element={<AppShell />}
          >

            {/* Dashboard */}

            <Route
              index
              element={<Dashboard />}
            />

            {/* Complete profile */}

            <Route
              path="complete-profile"
              element={
                <CompleteProfile />
              }
            />

            {/* Services */}

            <Route
              path="services"
              element={<Services />}
            />

            {/* Lemak Expert */}

            <Route
              path="lemak-expert-product"
              element={
                <LemakExpertProduct />
              }
            />

            {/* VTU */}

            <Route
              path="airtime"
              element={<Airtime />}
            />

            <Route
              path="data"
              element={<Data />}
            />

            <Route
              path="electricity"
              element={<Electricity />}
            />

            <Route
              path="cable"
              element={<Cable />}
            />

            <Route
              path="betting"
              element={<Betting />}
            />

            <Route
              path="education"
              element={<Education />}
            />

            <Route
              path="epin"
              element={<Epin />}
            />

            <Route
              path="broadband"
              element={<Broadband />}
            />

            {/* Social growth */}

            <Route
              path="social-growth"
              element={
                <SocialGrowth />
              }
            />

            {/* Virtual numbers */}

            <Route
              path="virtual-numbers"
              element={
                <VirtualNumbers />
              }
            />

            <Route
              path="virtual-numbers/order/:orderId"
              element={
                <VirtualNumberOrder />
              }
            />

            {/* Wallet */}

            <Route
              path="wallet"
              element={<Wallet />}
            />

            {/* Transactions */}

            <Route
              path="transactions"
              element={
                <Transactions />
              }
            />

            {/* Notifications */}

            <Route
              path="notifications"
              element={
                <Notifications />
              }
            />

            {/* Support */}

            <Route
              path="support"
              element={<Support />}
            />

            {/* Profile */}

            <Route
              path="profile"
              element={<Profile />}
            />

            {/* Settings */}

            <Route
              path="settings"
              element={<Settings />}
            />

            {/* Referrals */}

            <Route
              path="referrals"
              element={<Referrals />}
            />

            {/* Marketplace */}

            <Route
              path="marketplace"
              element={
                <Marketplace />
              }
            />

            <Route
              path="marketplace/listing/:listingId"
              element={
                <ListingDetail />
              }
            />

            {/* Analytics */}

            <Route
              path="analytics"
              element={<Analytics />}
            />

          </Route>

          {/* ========================================
              ADMIN APP
          ======================================== */}

          <Route element={<AdminShell />}>

            <Route
              path="/admin"
              element={
                <AdminDashboard />
              }
            />

            <Route
              path="/admin/users"
              element={
                <AdminUsers />
              }
            />

            <Route
              path="/admin/transactions"
              element={
                <AdminTransactions />
              }
            />

            <Route
              path="/admin/pricing"
              element={
                <AdminPricing />
              }
            />

            <Route
              path="/admin/promos"
              element={
                <AdminPromos />
              }
            />

            <Route
              path="/admin/marketplace"
              element={
                <AdminMarketplace />
              }
            />

            <Route
              path="/admin/virtual-numbers"
              element={
                <AdminVirtualNumbers />
              }
            />

            <Route
              path="/admin/settings"
              element={
                <AdminSettings />
              }
            />

            <Route
              path="/admin/system-health"
              element={
                <AdminSystemHealth />
              }
            />

            <Route
              path="/admin/profit-calculator"
              element={
                <AdminProfitCalculator />
              }
            />

            <Route
              path="/admin/events"
              element={
                <AdminEvents />
              }
            />

            {/* Lemak Expert Product Management */}

            <Route
              path="/admin/expert-product-management"
              element={
                <LemakExpertProductManagement />
              }
            />

          </Route>

        </Route>

        {/* ==========================================
            404
        ========================================== */}

        <Route
          path="*"
          element={<PageNotFound />}
        />

      </Routes>
    </Suspense>
  );
}

// --------------------------------------------------
// Main App
// --------------------------------------------------

export default function App() {
  // ------------------------------------------------
  // Google Ads / Analytics loader
  // ------------------------------------------------

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!GADS_CONVERSION_ID) {
      return;
    }

    const existingScript =
      document.querySelector(
        `script[src*="googletagmanager.com/gtag/js?id=${GADS_CONVERSION_ID}"]`
      );

    if (!existingScript) {
      const script =
        document.createElement("script");

      script.async = true;

      script.src =
        `https://www.googletagmanager.com/gtag/js?id=${GADS_CONVERSION_ID}`;

      document.head.appendChild(script);
    }

    window.dataLayer =
      window.dataLayer || [];

    window.gtag =
      window.gtag ||
      function () {
        window.dataLayer.push(arguments);
      };

    window.gtag(
      "js",
      new Date()
    );

    window.gtag(
      "config",
      GADS_CONVERSION_ID
    );
  }, []);

  return (
    <QueryClientProvider
      client={queryClientInstance}
    >
      <Router>

        <ScrollToTop />

        <AuthProvider>

          <AuthenticatedApp />

          <Toaster />

        </AuthProvider>

      </Router>
    </QueryClientProvider>
  );
}

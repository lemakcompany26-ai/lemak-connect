import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
} from "react";
import { base44 } from "@/api/base44Client";
import { appParams } from "@/lib/app-params";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] =
    useState(true);

  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  /**
   * Check the currently authenticated Base44 user.
   */
  const checkUserAuth = useCallback(async () => {
    try {
      setIsLoadingAuth(true);
      setAuthError(null);

      const currentUser = await base44.auth.me();

      if (currentUser) {
        setUser(currentUser);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error("User auth check failed:", error);

      setUser(null);
      setIsAuthenticated(false);

      if (error?.status === 401 || error?.status === 403) {
        setAuthError({
          type: "auth_required",
          message: "Authentication required",
        });
      }
    } finally {
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  }, []);

  /**
   * Check app settings and authentication.
   *
   * IMPORTANT:
   * Authentication should not depend exclusively on appParams.token.
   * After login/OTP, the SDK may have already stored the session while
   * appParams.token is still unavailable.
   */
  const checkAppState = useCallback(async () => {
    setIsLoadingPublicSettings(true);
    setIsLoadingAuth(true);
    setAuthError(null);

    try {
      try {
        const publicSettings =
          await base44.app.getPublicSettings();

        setAppPublicSettings(publicSettings);
      } catch (appError) {
        console.error(
          "Failed to load public app settings:",
          appError
        );

        if (
          appError?.status === 403 &&
          appError?.data?.extra_data?.reason
        ) {
          const reason =
            appError.data.extra_data.reason;

          if (reason === "auth_required") {
            setAuthError({
              type: "auth_required",
              message: "Authentication required",
            });
          } else if (reason === "user_not_registered") {
            setAuthError({
              type: "user_not_registered",
              message:
                "User not registered for this app",
            });
          } else {
            setAuthError({
              type: reason,
              message:
                appError?.message ||
                "Application error",
            });
          }
        }
      }

      /*
       * Always check the current user.
       *
       * Do NOT require appParams.token here.
       */
      await checkUserAuth();
    } catch (error) {
      console.error(
        "Unexpected authentication error:",
        error
      );

      setUser(null);
      setIsAuthenticated(false);

      setAuthError({
        type: "unknown",
        message:
          error?.message ||
          "An unexpected error occurred",
      });

      setIsLoadingAuth(false);
      setAuthChecked(true);
    } finally {
      setIsLoadingPublicSettings(false);
    }
  }, [checkUserAuth]);

  /**
   * Initial authentication check.
   */
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      if (!mounted) return;

      await checkAppState();
    };

    initialize();

    return () => {
      mounted = false;
    };
  }, [checkAppState]);

  /**
   * Logout.
   */
  const logout = useCallback(
    (shouldRedirect = true) => {
      setUser(null);
      setIsAuthenticated(false);
      setAuthChecked(true);

      try {
        if (shouldRedirect) {
          base44.auth.logout(window.location.origin);
        } else {
          base44.auth.logout();
        }
      } catch (error) {
        console.error("Logout failed:", error);
      }
    },
    []
  );

  /**
   * Redirect to Base44 login.
   */
  const navigateToLogin = useCallback(() => {
    try {
      base44.auth.redirectToLogin(
        window.location.href
      );
    } catch (error) {
      console.error(
        "Unable to redirect to login:",
        error
      );
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,

        // Main loading state
        isLoadingAuth,

        // Compatibility alias for components
        // that expect `isLoading`
        isLoading: isLoadingAuth,

        isLoadingPublicSettings,

        authError,
        appPublicSettings,
        authChecked,

        logout,
        navigateToLogin,

        checkUserAuth,
        checkAppState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used within an AuthProvider"
    );
  }

  return context;
};

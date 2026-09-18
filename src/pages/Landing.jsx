import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import PublicNavbar from '@/components/public/PublicNavbar';
import PublicFooter from '@/components/public/PublicFooter';
import HeroSection from '@/components/landing/HeroSection';
import ServicesSection from '@/components/landing/ServicesSection';
import HowItWorksSection from '@/components/landing/HowItWorksSection';
import FeatureSections from '@/components/landing/FeatureSections';
import WhySection from '@/components/landing/WhySection';

// Public marketing page. Signed-in users opening the app here are routed
// straight to their dashboard instead of seeing the landing page again.
export default function Landing() {
  const { isAuthenticated, authChecked } = useAuth();

  if (authChecked && isAuthenticated) return <Navigate to="/app" replace />;

  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />
      <main>
        <HeroSection />
        <ServicesSection />
        <HowItWorksSection />
        <FeatureSections />
        <WhySection />
      </main>
      <PublicFooter />
    </div>
  );
}
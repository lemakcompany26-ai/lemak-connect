import PublicNavbar from '@/components/public/PublicNavbar';
import PublicFooter from '@/components/public/PublicFooter';
import HeroSection from '@/components/landing/HeroSection';
import ServicesSection from '@/components/landing/ServicesSection';
import HowItWorksSection from '@/components/landing/HowItWorksSection';
import FeatureSections from '@/components/landing/FeatureSections';
import WhySection from '@/components/landing/WhySection';

export default function Landing() {
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
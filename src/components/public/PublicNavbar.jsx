import { Link } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';

// Minimal public bar (Terms / Privacy). The app is login-first — there is no
// public landing page.
export default function PublicNavbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-lg">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between">
        <Logo />
        <div className="flex items-center gap-2">
          <Button variant="ghost" asChild className="h-10 text-sm font-medium">
            <Link to="/login"><LogIn className="w-4 h-4 mr-2" /> Login</Link>
          </Button>
          <Button asChild className="h-10 text-sm font-semibold shadow-md shadow-primary/25">
            <Link to="/register">Get Started</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
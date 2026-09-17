import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, LogIn } from 'lucide-react';
import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';

const LINKS = [
  { label: 'Services', to: '/services' },
  { label: 'Marketplace', to: '/marketplace' },
  { label: 'How It Works', to: '/how-it-works' },
  { label: 'Support', to: '/support' }
];

export default function PublicNavbar() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-lg">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between">
        <Logo />
        <nav className="hidden md:flex items-center gap-8">
          {LINKS.map(l => (
            <Link key={l.to} to={l.to} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="hidden md:flex items-center gap-3">
          <Button variant="ghost" asChild className="h-10 text-sm font-medium">
            <Link to="/login"><LogIn className="w-4 h-4 mr-2" /> Login</Link>
          </Button>
          <Button asChild className="h-10 text-sm font-semibold shadow-md shadow-primary/25">
            <Link to="/register">Get Started</Link>
          </Button>
        </div>
        <button className="md:hidden p-2 rounded-lg hover:bg-muted" onClick={() => setOpen(!open)} aria-label="Menu">
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>
      {open && (
        <div className="md:hidden border-t border-border bg-background px-4 py-4 space-y-1 animate-fade-in">
          {LINKS.map(l => (
            <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className="block px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-muted">
              {l.label}
            </Link>
          ))}
          <div className="pt-3 flex flex-col gap-2">
            <Button variant="outline" asChild className="w-full h-11"><Link to="/login">Login</Link></Button>
            <Button asChild className="w-full h-11"><Link to="/register">Get Started</Link></Button>
          </div>
        </div>
      )}
    </header>
  );
}
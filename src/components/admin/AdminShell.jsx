import { useEffect, useState } from 'react';
import { Outlet, useNavigate, NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, ReceiptText, BadgePercent, Ticket, Store, Settings, Activity, ShieldCheck, Phone, Calculator } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import Logo from '@/components/Logo';
import { cn } from '@/lib/utils';

const ADMIN_EMAILS = ['lemakcompany26@gmail.com', 'dammyqueen107@gmail.com'];
const STAFF_ROLES = ['admin', 'super_admin', 'moderator'];

const NAV = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/transactions', label: 'Transactions', icon: ReceiptText },
  { to: '/admin/pricing', label: 'Pricing & Fees', icon: BadgePercent },
  { to: '/admin/promos', label: 'Promo Codes', icon: Ticket },
  { to: '/admin/marketplace', label: 'Marketplace', icon: Store },
  { to: '/admin/virtual-numbers', label: 'Virtual Numbers', icon: Phone },
  { to: '/admin/profit-calculator', label: 'Profit Calculator', icon: Calculator },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
  { to: '/admin/system-health', label: 'System Health', icon: Activity }
];

export default function AdminShell() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await base44.functions.invoke('getMyProfile', {});
        const d = res.data || res;
        const p = d.profile;
        const email = (d.user && d.user.email || '').toLowerCase();
        const isStaff = (p && STAFF_ROLES.includes(p.role)) || ADMIN_EMAILS.includes(email);
        if (!mounted) return;
        if (!isStaff) {
          navigate('/app', { replace: true });
        } else {
          setProfile(p);
          setAuthorized(true);
        }
      } catch (e) {
        if (mounted) navigate('/app', { replace: true });
      } finally {
        if (mounted) setChecking(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (checking || !authorized) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-64 z-40 bg-secondary flex flex-col">
        <div className="px-5 py-5 border-b border-white/10"><Logo light /></div>
        <div className="px-5 py-3 border-b border-white/10">
          <div className="flex items-center gap-2 text-xs font-semibold text-white/70">
            <ShieldCheck className="w-4 h-4 text-blue-300" /> Admin Panel
          </div>
          <div className="mt-1 text-[11px] text-white/40 capitalize">{profile ? profile.role.replace('_', ' ') : ''}</div>
        </div>
        <nav className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-1">
          {NAV.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/admin'}
              className={({ isActive }) => cn(
                'flex items-center gap-3 rounded-xl px-3.5 h-11 text-sm transition-colors',
                isActive ? 'bg-primary text-white font-semibold shadow-md shadow-primary/30' : 'text-white/75 hover:bg-white/10'
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-white/10">
          <button onClick={() => logout()} className="w-full flex items-center gap-3 rounded-xl px-3.5 h-11 text-sm text-white/80 hover:bg-white/10">
            Sign out
          </button>
        </div>
      </aside>

      <div className="lg:pl-64">
          <div className="safe-top lg:hidden px-4 py-3 border-b border-border flex items-center gap-2 overflow-x-auto">
          {NAV.map(item => (
            <NavLink key={item.to} to={item.to} end={item.to === '/admin'}
              className={({ isActive }) => cn('shrink-0 text-xs font-semibold px-3 py-2 rounded-full', isActive ? 'bg-primary text-white' : 'bg-muted text-muted-foreground')}>
              {item.label}
            </NavLink>
          ))}
        </div>
        <main className="safe-inline mx-auto max-w-6xl px-4 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
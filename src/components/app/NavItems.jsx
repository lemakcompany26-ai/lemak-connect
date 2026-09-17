import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, LayoutGrid, Smartphone, Wifi, Lightbulb, Tv, Trophy, GraduationCap, Ticket, Globe, Phone, TrendingUp, BarChart3, Store, Wallet, ReceiptText, Bell, Headset, UserCircle, Settings, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

export const APP_NAV = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/app/services', label: 'Services', icon: LayoutGrid },
  { to: '/app/wallet', label: 'Wallet', icon: Wallet },
  { to: '/app/transactions', label: 'Transactions', icon: ReceiptText },
  { to: '/app/notifications', label: 'Notifications', icon: Bell },
  { to: '/app/marketplace', label: 'Marketplace', icon: Store },
  { to: '/app/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/app/support', label: 'Support', icon: Headset }
];

export const SERVICE_NAV = [
  { to: '/app/airtime', label: 'Airtime', icon: Smartphone, soon: false },
  { to: '/app/data', label: 'Data', icon: Wifi, soon: false },
  { to: '/app/electricity', label: 'Electricity', icon: Lightbulb, soon: true },
  { to: '/app/cable', label: 'Cable TV', icon: Tv, soon: true },
  { to: '/app/betting', label: 'Betting', icon: Trophy, soon: true },
  { to: '/app/education', label: 'Education', icon: GraduationCap, soon: true },
  { to: '/app/epin', label: 'ePIN / Recharge', icon: Ticket, soon: true },
  { to: '/app/broadband', label: 'Broadband', icon: Globe, soon: true },
  { to: '/app/virtual-numbers', label: 'Virtual Numbers', icon: Phone, soon: true },
  { to: '/app/social-growth', label: 'Social Growth', icon: TrendingUp, soon: true }
];

export const ACCOUNT_NAV = [
  { to: '/app/profile', label: 'Profile', icon: UserCircle },
  { to: '/app/settings', label: 'Settings', icon: Settings }
];

export function NavItem({ item, onNavigate, unreadCount }) {
  const location = useLocation();
  const active = location.pathname === item.to;
  const disabled = item.soon;
  const content = (
    <>
      <item.icon className={cn('w-4.5 h-4.5 w-5 h-5 shrink-0', active ? 'text-white' : 'text-white/60')} />
      <span className={cn('flex-1 truncate', active ? 'font-semibold text-white' : 'text-white/80')}>{item.label}</span>
      {disabled && <Lock className="w-3.5 h-3.5 text-white/30" />}
      {unreadCount > 0 && (
        <span className="ml-auto min-w-5 h-5 px-1.5 rounded-full bg-destructive text-white text-[10px] font-bold flex items-center justify-center">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </>
  );
  const cls = cn(
    'w-full flex items-center gap-3 rounded-xl px-3.5 h-11 text-sm transition-colors',
    active ? 'bg-primary text-white shadow-md shadow-primary/30' : 'hover:bg-white/10',
    disabled && 'opacity-45 cursor-default'
  );
  if (disabled) {
    return <div className={cls} title="Launching soon">{content}</div>;
  }
  return (
    <Link to={item.to} onClick={onNavigate} className={cls}>
      {content}
    </Link>
  );
}
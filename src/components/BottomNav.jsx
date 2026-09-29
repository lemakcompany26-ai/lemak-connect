import { Link, useLocation } from 'react-router-dom';

export default function BottomNav(){
  const {pathname} = useLocation();
  const tabs = [
    { to: '/app', label: 'Home', d: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1.45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z' },
    { to: '/app/rewards', label: 'Rewards', d: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5' },
    { to: '/app/wealth', label: 'Wealth', d: 'M3 13h2v8H3zm4-8h2v16H7zm4-2h2v18h-2zm4 4h2v14h-2zm4 8h2v6h-2z' },
    { to: '/app/cards', label: 'Cards', d: 'M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z' },
    { to: '/app/me', label: 'Me', d: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z' },
  ];
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-around pt-2 pb-3 z-50">
      {tabs.map(t=>{
        const active = pathname === t.to || (t.to==='/app' && pathname==='/app/dashboard');
        return (
          <Link key={t.to} to={t.to} className={`flex flex-col items-center ${active?'text-[#00B875]':'text-gray-400'}`}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill={active?'#00B875':'none'} stroke="currentColor" strokeWidth="1.6"><path d={t.d} /></svg>
            <span className={`text-[11px] mt-1 ${active?'font-bold':''}`}>{t.label}</span>
          </Link>
        )
      })}
    </div>
  )
}

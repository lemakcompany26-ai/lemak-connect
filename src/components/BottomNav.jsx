import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function BottomNav(){
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const tabs = [
    { id: 'home', label: 'Home', icon: '🏠', path: '/' },
    { id: 'rentals', label: 'Rentals', icon: '🏘️', path: '/rentals' },
    { id: 'market', label: 'Market', icon: '🛒', path: '/marketplace' },
    { id: 'wallet', label: 'Wallet', icon: '💳', path: '/wallet' },
    { id: 'profile', label: 'Profile', icon: '👤', path: '/profile' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-2 py-2 flex justify-around z-50 rounded-t-[20px] shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
      {tabs.map(tab=>{
        const active = pathname === tab.path || (tab.path === '/rentals' && pathname.startsWith('/rentals'));
        return (
          <button
            key={tab.id}
            onClick={()=>navigate(tab.path)}
            className={`flex flex-col items-center px-4 py-1 rounded-full transition-all ${active? 'text-[#0DBF6A] bg-[#F0FFF6]' : 'text-gray-400'}`}
          >
            <span className="text-[20px]">{tab.icon}</span>
            <span className={`text-[11px] font-bold mt-1 ${active? 'text-[#0DBF6A]' : ''}`}>{tab.label}</span>
            {active && tab.id==='rentals' && <span className="w-1 h-1 bg-[#0DBF6A] rounded-full mt-1"></span>}
          </button>
        )
      })}
    </div>
  )
}

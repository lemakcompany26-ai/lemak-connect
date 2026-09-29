import React from 'react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const mainServices = [
    { to: '/app/airtime', label: 'Airtime', icon: '📱', color: 'bg-blue-500' },
    { to: '/app/data', label: 'Data', icon: '📶', color: 'bg-green-500' },
    { to: '/app/electricity', label: 'Electricity', icon: '⚡', color: 'bg-amber-500' },
    { to: '/app/cable', label: 'Cable TV', icon: '📺', color: 'bg-purple-500' },
    { to: '/app/betting', label: 'Betting', icon: '🏆', color: 'bg-red-500' },
    { to: '/app/education', label: 'Education', icon: '🎓', color: 'bg-sky-500' },
    { to: '/app/epin', label: 'ePIN', icon: '🎟️', color: 'bg-orange-500' },
    { to: '/app/broadband', label: 'Broadband', icon: '🌐', color: 'bg-emerald-500' },
  ];

  const virtualServices = [
    { to: '/app/otp', label: 'OTP Verification', desc: 'Receive OTP instantly', icon: '🛡️', color: 'bg-blue-600' },
    { to: '/app/social-otp', label: 'Social Media OTP', desc: 'Get codes for social platforms', icon: '💬', color: 'bg-sky-500' },
    { to: '/app/email-otp', label: 'Email Verification', desc: 'Verify your email address', icon: '✉️', color: 'bg-pink-500' },
    { to: '/app/temporary', label: 'Temporary Numbers', desc: 'Use for a short period', icon: '⏱️', color: 'bg-amber-500' },
    { to: '/app/virtual-rental', label: 'Virtual Number Rental', desc: 'Rent a number long-term', icon: '📅', color: 'bg-emerald-500' },
  ];

  const digitalServices = [
    { to: '/app/marketing', label: 'Digital Marketing', desc: 'Grow your audience across social platforms', icon: '🚀', color: 'bg-blue-600' },
    { to: '/app/tiktok', label: 'TikTok', icon: '🎵', color: 'bg-pink-500' },
    { to: '/app/instagram', label: 'Instagram', icon: '📸', color: 'bg-purple-500' },
    { to: '/app/facebook', label: 'Facebook', icon: '📘', color: 'bg-blue-500' },
    { to: '/app/youtube', label: 'YouTube', icon: '▶️', color: 'bg-red-500' },
    { to: '/rentals', label: 'Rentals', desc: 'Houses & Services', icon: '🏠', color: 'bg-violet-600' },
    { to: '/app/more', label: 'More', icon: '🏪', color: 'bg-blue-600' },
  ];

  return (
    <div className="min-h-screen bg-[#EAF4FF] pb-[100px]">
      <div className="px-4 py-3 flex justify-between items-center sticky top-0 z-20 bg-[#EAF4FF]">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white font-black">L</div>
          <div className="leading-none">
            <p className="font-black text-[16px] text-blue-600">Lemak</p>
            <p className="font-black text-[16px] -mt-1">Connect</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm">🛡️</div>
          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm">🔔</div>
          <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">L</div>
        </div>
      </div>

      <div className="px-3">
        <div className="w-full h-[150px] bg-black rounded-[16px] overflow-hidden relative">
          <video autoPlay muted loop playsInline className="w-full h-full object-cover" src="https://www.w3schools.com/html/mov_bbb.mp4" />
          <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded-full">ADVERT • Lemak Connect</div>
        </div>
      </div>

      <div className="px-3 mt-4 grid grid-cols-3 gap-3">
        {mainServices.map((s) => (
          <Link key={s.to} to={s.to} className="bg-white rounded-[18px] h-[108px] flex flex-col items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-white">
            <div className={`w-[48px] h-[48px] ${s.color} rounded-[14px] flex items-center justify-center text-white text-[20px]`}>{s.icon}</div>
            <p className="text-[12px] font-bold mt-2 text-slate-800">{s.label}</p>
          </Link>
        ))}
      </div>

      <div className="px-4 mt-7">
        <h2 className="text-[11px] font-extrabold tracking-widest text-slate-500 mb-3">VIRTUAL NUMBERS & OTP</h2>
        <div className="grid grid-cols-3 gap-3">
          {virtualServices.map((s) => (
            <Link key={s.to} to={s.to} className="bg-white rounded-[18px] p-3 flex flex-col items-center text-center shadow-[0_2px_8px_rgba(0,0,0,0.04)] min-h-[135px] justify-center border border-white">
              <div className={`w-[46px] h-[46px] ${s.color} rounded-[13px] flex items-center justify-center text-white text-[18px]`}>{s.icon}</div>
              <p className="text-[11px] font-extrabold mt-2 leading-tight text-slate-800">{s.label}</p>
              <p className="text-[9px] text-slate-500 mt-1 leading-tight">{s.desc}</p>
            </Link>
          ))}
        </div>
      </div>

      <div className="px-4 mt-7">
        <h2 className="text-[11px] font-extrabold tracking-widest text-slate-500 mb-3">DIGITAL GROWTH</h2>
        <div className="grid grid-cols-3 gap-3">
          {digitalServices.map((s) => (
            <Link key={s.to} to={s.to} className="bg-white rounded-[18px] p-3 flex flex-col items-center text-center shadow-[0_2px_8px_rgba(0,0,0,0.04)] min-h-[125px] justify-center border border-white">
              <div className={`w-[46px] h-[46px] ${s.color} rounded-[13px] flex items-center justify-center text-white text-[18px]`}>{s.icon}</div>
              <p className="text-[11px] font-extrabold mt-2 leading-tight text-slate-800">{s.label}</p>
              {s.desc && <p className="text-[9px] text-slate-500 mt-1 leading-tight">{s.desc}</p>}
            </Link>
          ))}
        </div>
      </div>

      <div className="px-4 mt-7">
        <h2 className="text-[11px] font-extrabold tracking-widest text-slate-500">MARKETPLACE</h2>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function AdSlider(){
  const ADS = [
    { title:'Airtime', sub:'Buy airtime for all networks (MTN, Airtel, Glo, 9mobile).', bg:'bg-[#E8F2FF]', icon:'📱', dot:'bg-blue-600', btn:'bg-blue-600', link:'/app/airtime' },
    { title:'Data', sub:'Affordable data for all networks', bg:'bg-[#F3E8FF]', icon:'🌐', dot:'bg-purple-600', btn:'bg-purple-600', link:'/app/data' },
    { title:'Electricity', sub:'Pay your electricity bill (PHCN & DISCOs)', bg:'bg-[#FFF8E1]', icon:'⚡', dot:'bg-amber-500', btn:'bg-amber-500', link:'/app/electricity' },
    { title:'Cable TV', sub:'Renew DStv, GOtv, Startimes and more', bg:'bg-[#FFE4EC]', icon:'📺', dot:'bg-pink-600', btn:'bg-pink-600', link:'/app/cable' },
    { title:'Betting', sub:'Fund your betting wallet and place bets', bg:'bg-[#E6F9E6]', icon:'🎮', dot:'bg-green-600', btn:'bg-green-600', link:'/app/betting' },
    { title:'Subscriptions', sub:'Netflix, Spotify, YouTube & more', bg:'bg-[#E8F0FF]', icon:'🗓️', dot:'bg-blue-700', btn:'bg-blue-700', link:'/app/education' },
    { title:'Virtual Numbers', sub:'Get international numbers for OTP', bg:'bg-[#F5E8FF]', icon:'📲', dot:'bg-violet-600', btn:'bg-violet-600', link:'/app/virtual-rental' },
    { title:'OTP Service', sub:'Receive OTPs from global platforms', bg:'bg-[#E0F5F0]', icon:'💬', dot:'bg-teal-600', btn:'bg-teal-600', link:'/app/otp' },
    { title:'SMM / Digital Growth', sub:'Likes, views, followers & engagement', bg:'bg-[#FFE8EC]', icon:'📈', dot:'bg-red-500', btn:'bg-red-500', link:'/app/marketing' },
    { title:'Social Marketplace', sub:'Buy and sell safely with escrow', bg:'bg-[#E6F2FF]', icon:'🛍️', dot:'bg-blue-500', btn:'bg-blue-500', link:'/app/more' },
    { title:'Rental Services', sub:'Houses, events, water, power, fumigation', bg:'bg-[#EDE8FF]', icon:'🏠', dot:'bg-purple-700', btn:'bg-purple-700', link:'/rentals' },
    { title:'More Services', sub:'Check app for more coming soon', bg:'bg-[#E6F9E6]', icon:'⊞', dot:'bg-[#00B875]', btn:'bg-[#00B875]', link:'/app/more' },
  ];

  const [current, setCurrent] = useState(0);
  useEffect(()=>{
    const t = setInterval(()=> setCurrent(p => (p+1)%ADS.length), 5000);
    return ()=> clearInterval(t);
  },[]);

  const ad = ADS[current];

  return (
    <div className="w-full">
      <Link to={ad.link} className={`w-full rounded-[16px] p-4 flex justify-between items-center transition-all duration-700 ${ad.bg} border border-white shadow-sm`}>
        <div className="flex gap-3 items-center">
          <div className="w-12 h-12 bg-white rounded-[12px] flex items-center justify-center text-xl shadow-sm">{ad.icon}</div>
          <div>
            <p className="font-extrabold text-[13px] text-slate-900">{ad.title}</p>
            <p className="text-[11px] text-slate-600 leading-tight mt-0.5">{ad.sub}</p>
          </div>
        </div>
        <div className={`${ad.btn} text-white text-[11px] px-4 py-2 rounded-full font-bold`}>Go</div>
      </Link>
      <div className="flex justify-center gap-1.5 mt-2">
        {ADS.map((_, i)=>(
          <div key={i} className={`h-1.5 rounded-full transition-all ${i===current?'w-6 bg-blue-600':'w-1.5 bg-slate-300'}`}></div>
        ))}
      </div>
    </div>
  )
}

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

      {/* REMOVED VIDEO - NOW YOUR ANIMATED AD */}
      <div className="px-3">
        <AdSlider />
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
    </div>
  );
            }

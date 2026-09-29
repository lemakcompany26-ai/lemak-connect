import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const ADS = [
  {
  id: 6,
  bg: 'bg-[#E8F0FF]',
  icon: '🎬',
  title: 'Subscriptions',
  sub: 'Pay for Netflix, Spotify, YouTube & more.',
  btn: 'Subscribe',
  link: '/app/services',
  color: 'bg-blue-700'
},

{
  id: 8,
  bg: 'bg-[#E0F5F0]',
  icon: '💬',
  title: 'OTP Service',
  sub: 'Receive OTPs from global platforms (chat-only).',
  btn: 'Get OTP',
  link: '/app/virtual-numbers',
  color: 'bg-teal-600'
},

{
  id: 9,
  bg: 'bg-[#FFE8EC]',
  icon: '📈',
  title: 'SMM / Digital Growth',
  sub: 'Get likes, views, followers & engagement.',
  btn: 'Grow Now',
  link: '/app/social-growth',
  color: 'bg-red-500'
},

{
  id: 11,
  bg: 'bg-[#EDE8FF]',
  icon: '🏠',
  title: 'Rental Services',
  sub: 'Book houses, events, water, power, fumigation & more.',
  btn: 'Book',
  link: '/rentals',
  color: 'bg-violet-600'
}
  { id:1, bg:'bg-[#E8F2FF]', icon:'📱', title:'Airtime', sub:'Buy airtime for all networks (MTN, Airtel, Glo, 9mobile).', btn:'Buy', link:'/app/airtime', color:'bg-blue-600' },
  { id:2, bg:'bg-[#F3E8FF]', icon:'🌐', title:'Data', sub:'Affordable data for all networks (MTN, Airtel, Glo, 9mobile).', btn:'Get Data', link:'/app/data', color:'bg-purple-600' },
  { id:3, bg:'bg-[#FFF4CC]', icon:'⚡', title:'Electricity', sub:'Pay your electricity bill (PHCN & DISCOs) instantly.', btn:'Pay Bill', link:'/app/electricity', color:'bg-yellow-500' },
  { id:4, bg:'bg-[#FFE4E8]', icon:'📺', title:'Cable TV', sub:'Renew your DStv, GOtv, Startimes and more.', btn:'Renew', link:'/app/cable', color:'bg-pink-600' },
  { id:5, bg:'bg-[#E6F9E6]', icon:'🎮', title:'Betting', sub:'Fund your betting wallet and place your bets.', btn:'Fund', link:'/app/betting', color:'bg-green-600' },
  { id:6, bg:'bg-[#E8F0FF]', icon:'🎬', title:'Subscriptions', sub:'Pay for Netflix, Spotify, YouTube & more.', btn:'Subscribe', link:'/app/subscriptions', color:'bg-blue-700' },
  { id:7, bg:'bg-[#F5E8FF]', icon:'📲', title:'Virtual Numbers', sub:'Get international numbers for OTP and verification.', btn:'Get Number', link:'/app/virtual-numbers', color:'bg-purple-700' },
  { id:8, bg:'bg-[#E0F5F0]', icon:'💬', title:'OTP Service', sub:'Receive OTPs from global platforms (chat-only).', btn:'Get OTP', link:'/app/otp', color:'bg-teal-600' },
  { id:9, bg:'bg-[#FFE8EC]', icon:'📈', title:'SMM / Digital Growth', sub:'Get likes, views, followers & engagement.', btn:'Grow Now', link:'/app/smm', color:'bg-red-500' },
  { id:10, bg:'bg-[#E6F2FF]', icon:'🛒', title:'Social Marketplace', sub:'Buy and sell safely with escrow protection.', btn:'Explore', link:'/app/marketplace', color:'bg-blue-500' },
  { id:11, bg:'bg-[#EDE8FF]', icon:'🏠', title:'Rental Services', sub:'Book houses, events, water, power, fumigation & more.', btn:'Book', link:'/app/rentals', color:'bg-violet-600' },
  { id:12, bg:'bg-[#E6F9E6]', icon:'⊞', title:'More Services', sub:'Check the app for more services coming soon.', btn:'View All', link:'/app/services', color:'bg-[#00B875]' },
];

export default function AdSlider(){
  const [current, setCurrent] = useState(0);

  useEffect(()=>{
    const timer = setInterval(()=>{
      setCurrent((prev)=> (prev + 1) % ADS.length);
    }, 5000);
    return ()=> clearInterval(timer);
  },[]);

  const ad = ADS[current];

  return (
    <div className="mx-3 mt-3">
      <Link to={ad.link} className={`flex justify-between items-center rounded-[16px] p-4 transition-all duration-700 ${ad.bg}`}>
        <div className="flex gap-3 items-center">
          <div className="w-11 h-11 bg-white rounded-full flex items-center justify-center text-xl shadow-sm">{ad.icon}</div>
          <div className="pr-2">
            <p className="font-bold text-[14px] text-[#1A1A1A]">{ad.title}</p>
            <p className="text-[11px] text-gray-600 leading-tight mt-0.5 line-clamp-2">{ad.sub}</p>
          </div>
        </div>
        <div className={`${ad.color} text-white px-4 py-2 rounded-full text-[11px] font-bold whitespace-nowrap`}>{ad.btn}</div>
      </Link>

      {/* Dots */}
      <div className="flex justify-center gap-1 mt-2.5">
        {ADS.map((_, i)=>(
          <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i===current?'w-6 bg-[#00B875]':'w-1.5 bg-gray-300'}`}></div>
        ))}
      </div>
    </div>
  )
}

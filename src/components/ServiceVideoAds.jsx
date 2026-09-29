import React, { useState, useEffect } from 'react';

export default function ServiceVideoAds(){
  const [current, setCurrent] = useState(0);
const [adminAds, setAdminAds] = useState([]);
useEffect(()=>{
  const saved = JSON.parse(localStorage.getItem("lemak_video_ads") || "[]");
  setAdminAds(saved);
},[]);
  // All your 12 services from flyer
  const services = [
    { tag: "AIRTIME", title: "Airtime", offer: "Buy airtime for all networks MTN, Airtel, Glo, 9mobile", color: "bg-blue-500", icon: "📱", video: "https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4", thumb: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800" },
    { tag: "DATA", title: "Data", offer: "Affordable data for all networks", color: "bg-purple-600", icon: "🌐", video: "https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4", thumb: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800" },
    { tag: "ELECTRICITY", title: "Electricity", offer: "Pay PHCN & DISCOs bill instantly", color: "bg-yellow-500", icon: "⚡", video: "https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4", thumb: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800" },
    { tag: "CABLE TV", title: "Cable TV", offer: "Renew DStv, GOtv, StarTimes", color: "bg-pink-600", icon: "📺", video: "https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4", thumb: "https://images.unsplash.com/photo-1593359677879-a4bb92f367d8?w=800" },
    { tag: "BETTING", title: "Betting", offer: "Fund your betting wallet and place bets", color: "bg-green-600", icon: "🎮", video: "https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4", thumb: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800" },
    { tag: "SUBSCRIPTIONS", title: "Subscriptions", offer: "Netflix, Spotify, YouTube Premium", color: "bg-blue-700", icon: "🗓️", video: "https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4", thumb: "https://images.unsplash.com/photo-1611162616805-ca93a385e196?w=800" },
    { tag: "VIRTUAL NUMBERS", title: "Virtual Numbers", offer: "Get international numbers for OTP", color: "bg-purple-700", icon: "📲", video: "https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4", thumb: "https://images.unsplash.com/photo-1596558450268-9c324a1a18d2?w=800" },
    { tag: "OTP SERVICE", title: "OTP Service", offer: "Receive OTPs from global platforms (chat-only)", color: "bg-teal-600", icon: "💬", video: "https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4", thumb: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800" },
    { tag: "SMM GROWTH", title: "SMM / Digital Growth", offer: "Get likes, views, followers & engagement", color: "bg-red-500", icon: "📈", video: "https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4", thumb: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800" },
    { tag: "MARKETPLACE", title: "Social Marketplace", offer: "Buy and sell safely with escrow protection", color: "bg-blue-600", icon: "🛍️", video: "https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4", thumb: "https://images.unsplash.com/photo-1556740738-b6a63e27c4df?w=800" },
    { tag: "RENTAL", title: "Rental Services", offer: "Book houses, events, water, power, fumigation", color: "bg-purple-800", icon: "🏠", video: "https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4", thumb: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800" },
    { tag: "MORE", title: "More Services", offer: "Check the app for more services coming soon", color: "bg-green-700", icon: "⚙️", video: "https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4", thumb: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800" },
  ];
const services = adminAds.length > 0? adminAds : [...default 12... ]
  useEffect(()=>{
    const t = setInterval(()=> setCurrent(c=>(c+1)%services.length), 3500);
    return ()=> clearInterval(t);
  },[]);

  const ad = services[current];

  return (
    <div className="mx-4 mt-4">
      <h3 className="font-extrabold text-[15px] mb-2">🔥 LEMAK Services - Video Adverts</h3>

      {/* BIG VIDEO AD */}
      <div className="relative bg-black rounded-[24px] overflow-hidden h-[260px] shadow-lg">
        <video key={ad.tag} autoPlay muted loop playsInline poster={ad.thumb} src={ad.video} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent"></div>

        <div className="absolute top-3 left-3 flex gap-2">
          <span className="bg-red-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full animate-pulse">● LIVE AD</span>
          <span className={`${ad.color} text-white text-[10px] font-bold px-3 py-1 rounded-full`}>{ad.tag}</span>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4">
          <p className="text-white font-extrabold text-[20px] flex items-center gap-2">{ad.icon} {ad.title}</p>
          <p className="text-white/90 text-[13px] mt-1 leading-tight">{ad.offer}</p>
          <div className="flex gap-2 mt-3">
            <button onClick={()=>window.location.href=`/marketplace`} className="bg-white text-black px-5 py-2.5 rounded-full text-[13px] font-extrabold">Use Now</button>
            <button onClick={()=>window.open(`https://wa.me/2349022143559?text=Hi, I want ${ad.title}`)} className="bg-[#0DBF6A] text-white px-5 py-2.5 rounded-full text-[13px] font-bold">WhatsApp</button>
          </div>
        </div>

        <div className="absolute top-1/2 right-2 -translate-y-1/2 flex flex-col gap-1">
          {services.map((_,i)=>(<div key={i} className={`w-1 h-6 rounded-full ${i===current?'bg-white':'bg-white/30'}`}></div>))}
        </div>
      </div>

      {/* THUMBNAILS GRID - All 12 services like your flyer but video */}
      <div className="grid grid-cols-4 gap-2 mt-4">
        {services.map((s,i)=>(
          <button key={s.tag} onClick={()=>setCurrent(i)} className={`rounded-[14px] p-2.5 text-left border-2 ${i===current?'border-[#0DBF6A] bg-[#F0FFF6]':'border-transparent bg-white'} shadow-sm`}>
            <div className={`w-8 h-8 rounded-full ${s.color} flex items-center justify-center text-white text-[16px]`}>{s.icon}</div>
            <p className="text-[10px] font-extrabold mt-2 leading-tight">{s.title}</p>
            <p className="text-[8px] text-gray-500 line-clamp-2 leading-tight mt-0.5">{s.offer}</p>
          </button>
        ))}
      </div>
    </div>
  )
     }

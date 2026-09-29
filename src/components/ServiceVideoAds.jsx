import React, { useState, useEffect } from 'react';

export default function ServiceVideoAds(){
  const [current, setCurrent] = useState(0);
  const services = [
    { tag:"AIRTIME", title:"Airtime", offer:"Buy airtime for all networks", color:"bg-blue-500", icon:"📱", thumb:"https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800" },
    { tag:"DATA", title:"Data", offer:"Affordable data for all networks", color:"bg-purple-600", icon:"🌐", thumb:"https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800" },
    { tag:"ELECTRICITY", title:"Electricity", offer:"Pay PHCN & DISCOs", color:"bg-yellow-500", icon:"⚡", thumb:"https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800" },
    { tag:"CABLE TV", title:"Cable TV", offer:"Renew DStv, GOtv", color:"bg-pink-600", icon:"📺", thumb:"https://images.unsplash.com/photo-1593359677879-a4bb92f367d8?w=800" },
    { tag:"BETTING", title:"Betting", offer:"Fund betting wallet", color:"bg-green-600", icon:"🎮", thumb:"https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800" },
    { tag:"RENTAL", title:"Rental Services", offer:"Houses, cleaning, fumigation", color:"bg-purple-800", icon:"🏠", thumb:"https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800" },
  ];
  useEffect(()=>{ const t=setInterval(()=>setCurrent(c=>(c+1)%services.length),4000); return ()=>clearInterval(t); },[]);
  const ad = services[current];
  return (
    <div className="mx-4 mt-4">
      <div className="relative bg-black rounded-[20px] overflow-hidden h-[200px]">
        <img src={ad.thumb} className="w-full h-full object-cover opacity-80" alt="" />
        <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent"></div>
        <div className="absolute top-3 left-3 flex gap-2">
          <span className="bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded-full">● LIVE AD</span>
          <span className={`${ad.color} text-white text-[10px] font-bold px-3 py-1 rounded-full`}>{ad.tag}</span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <p className="text-white font-extrabold text-[16px]">{ad.icon} {ad.title}</p>
          <p className="text-white/80 text-[12px]">{ad.offer}</p>
        </div>
      </div>
    </div>
  )
}

import React, { useState, useEffect } from 'react';

export default function ServiceVideoAds(){
  const [current, setCurrent] = useState(0);
  const [customAds, setCustomAds] = useState([]);

  const defaultAds = [
    { id:1, tag:"AIRTIME", title:"Airtime", offer:"Buy airtime for all networks MTN, Airtel, Glo, 9mobile", color:"bg-blue-500", icon:"📱", video:"https://www.w3schools.com/html/mov_bbb.mp4" },
    { id:2, tag:"DATA", title:"Data", offer:"Affordable data for all networks", color:"bg-purple-600", icon:"🌐", video:"https://www.w3schools.com/html/mov_bbb.mp4" },
    { id:3, tag:"ELECTRICITY", title:"Electricity", offer:"Pay PHCN & DISCOs bill instantly", color:"bg-yellow-500", icon:"⚡", video:"https://www.w3schools.com/html/mov_bbb.mp4" },
    { id:4, tag:"CABLE TV", title:"Cable TV", offer:"Renew DStv, GOtv, StarTimes", color:"bg-pink-600", icon:"📺", video:"https://www.w3schools.com/html/mov_bbb.mp4" },
    { id:5, tag:"BETTING", title:"Betting", offer:"Fund your betting wallet", color:"bg-green-600", icon:"🎮", video:"https://www.w3schools.com/html/mov_bbb.mp4" },
    { id:6, tag:"RENTAL", title:"Rental Services", offer:"Book houses, events, water, power, fumigation", color:"bg-purple-800", icon:"🏠", video:"https://www.w3schools.com/html/mov_bbb.mp4" },
  ];

  useEffect(()=>{
    const saved = JSON.parse(localStorage.getItem("lemak_video_ads") || "[]");
    if(saved.length > 0) setCustomAds(saved);
  },[]);

  const ads = customAds.length > 0? customAds : defaultAds;

  useEffect(()=>{
    const t = setInterval(()=> setCurrent(c=>(c+1)%ads.length), 4000);
    return ()=> clearInterval(t);
  },[ads.length]);

  const ad = ads[current] || defaultAds[0];

  const handleUpload = (e)=>{
    const file = e.target.files[0];
    if(!file) return;
    if(file.size > 20*1024*1024){ alert("Video too big, max 20MB. Use shorter video"); return; }
    const reader = new FileReader();
    reader.onload = ()=>{
      const newAd = {
        id: Date.now(),
        tag: "MY ADVERT",
        title: file.name.replace(".mp4",""),
        offer: "My custom advert video",
        color: "bg-green-600",
        icon: "🎬",
        video: reader.result
      };
      const updated = [newAd,...customAds];
      localStorage.setItem("lemak_video_ads", JSON.stringify(updated));
      setCustomAds(updated);
      alert("Advert video uploaded! It will now display in app.");
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="mx-4 mt-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-extrabold text-[14px]">🔥 LEMAK Adverts</h3>
        <label className="bg-black text-white text-[11px] px-3 py-1.5 rounded-full font-bold cursor-pointer">
          + Upload Video
          <input type="file" accept="video/*" onChange={handleUpload} className="hidden" />
        </label>
      </div>

      <div className="relative bg-black rounded-[20px] overflow-hidden h-[240px] shadow-lg">
        <video key={ad.id + current} autoPlay muted loop playsInline src={ad.video} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>

        <div className="absolute top-3 left-3 flex gap-2">
          <span className="bg-red-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full animate-pulse">● LIVE</span>
          <span className={`${ad.color} text-white text-[10px] font-bold px-3 py-1 rounded-full`}>{ad.tag}</span>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4">
          <p className="text-white font-extrabold text-[18px]">{ad.icon} {ad.title}</p>
          <p className="text-white/90 text-[12px] mt-1">{ad.offer}</p>
        </div>

        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-1.5">
          {ads.map((_,i)=>(<div key={i} className={`w-1.5 h-5 rounded-full ${i===current?'bg-white':'bg-white/30'}`}></div>))}
        </div>
      </div>

      <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
        {ads.map((s,i)=>(
          <button key={s.id} onClick={()=>setCurrent(i)} className={`min-w-[70px] rounded-xl p-2 text-left border-2 ${i===current?'border-[#0DBF6A] bg-[#F0FFF6]':'border-transparent bg-white'} shadow-sm`}>
            <p className="text-[10px] font-bold truncate">{s.title}</p>
            <p className="text-[8px] text-gray-500">{s.tag}</p>
          </button>
        ))}
      </div>
    </div>
  )
}

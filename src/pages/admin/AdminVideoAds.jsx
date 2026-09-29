import React, { useState, useEffect } from 'react';

const SERVICES = [
  "Airtime","Data","Electricity","Cable TV","Betting","Subscriptions",
  "Virtual Numbers","OTP Service","SMM / Digital Growth","Social Marketplace",
  "Rental Services","More Services"
];

export default function AdminVideoAds(){
  const [ads, setAds] = useState([]);
  const [service, setService] = useState(SERVICES[0]);
  const [title, setTitle] = useState("");
  const [offer, setOffer] = useState("");

  useEffect(()=>{
    setAds(JSON.parse(localStorage.getItem("lemak_video_ads") || "[]"));
  },[]);

  const handleVideo = (e)=>{
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = ()=>{
      const newAd = {
        id: Date.now(),
        tag: service.toUpperCase(),
        title: title || service,
        offer: offer || `Watch ${service} video advert`,
        video: reader.result, // base64 video
        thumb: "",
        color: "bg-blue-600",
        icon: "📱"
      };
      const updated = [newAd,...ads];
      setAds(updated);
      localStorage.setItem("lemak_video_ads", JSON.stringify(updated));
      alert(`${service} video advert uploaded! Now shows in app.`);
      setTitle(""); setOffer("");
    };
    reader.readAsDataURL(file);
  };

  const deleteAd = (id)=>{
    const filtered = ads.filter(a=>a.id!==id);
    setAds(filtered);
    localStorage.setItem("lemak_video_ads", JSON.stringify(filtered));
  };

  return (
    <div className="min-h-screen bg-white p-4 pb-20">
      <h1 className="text-[22px] font-extrabold">Admin - Video Adverts</h1>
      <p className="text-sm text-gray-500">Upload video for any service. It will show in Dashboard as LIVE AD.</p>

      <div className="mt-6 bg-[#F7F8FA] p-4 rounded-[16px]">
        <label className="text-xs font-bold">Select Service</label>
        <select value={service} onChange={e=>setService(e.target.value)} className="w-full mt-1 p-3 rounded-xl border">
          {SERVICES.map(s=><option key={s}>{s}</option>)}
        </select>

        <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Title (e.g. Buy Airtime Fast)" className="w-full mt-3 p-3 rounded-xl border" />
        <input value={offer} onChange={e=>setOffer(e.target.value)} placeholder="Offer text (e.g. Instant delivery)" className="w-full mt-3 p-3 rounded-xl border" />

        <label className="mt-4 block bg-black text-white text-center py-3 rounded-full font-bold">
          📹 Choose Video from Phone
          <input type="file" accept="video/*" onChange={handleVideo} className="hidden" />
        </label>
        <p className="text-[11px] text-gray-400 mt-2">Video will be compressed automatically. Max 30 seconds recommended.</p>
      </div>

      <h3 className="font-bold mt-8">Uploaded Adverts ({ads.length})</h3>
      <div className="grid gap-3 mt-3">
        {ads.map(ad=>(
          <div key={ad.id} className="bg-white border rounded-xl p-3 flex gap-3">
            <video src={ad.video} className="w-20 h-20 rounded-xl object-cover bg-black" muted />
            <div className="flex-1">
              <p className="font-bold text-sm">{ad.tag} - {ad.title}</p>
              <p className="text-xs text-gray-500">{ad.offer}</p>
              <button onClick={()=>deleteAd(ad.id)} className="text-red-500 text-xs mt-1 font-bold">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
        }

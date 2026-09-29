import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import LiveAdPlayer from '../components/LiveAdPlayer';
import ConstructionVideos from '../components/ConstructionVideos';

export default function Rentals() {
  const [localRentals, setLocalRentals] = useState([]);
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("lemak_rentals") || "[]");
    setLocalRentals(saved);
    setTimeout(() => setLoading(false), 1000);
  }, []);

  const defaultRentals = [
    {
      id: 1,
      title: "2-Bed Flat in Bodija",
      location: "Bodija, Ibadan",
      price: 650000,
      type: "2-Bedroom",
      images: [
        "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800",
        "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800"
      ],
      videos: [],
      description: "Newly built, water running, light."
    },
    {
      id: 2,
      title: "Self-Contain in UI",
      location: "UI, Ibadan",
      price: 250000,
      type: "Self-Contain",
      images: ["https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800"],
      videos: [],
      description: "Close to school"
    }
  ];

  const allRentals = [...localRentals,...defaultRentals];
  const filtered = filter === 'All'? allRentals : allRentals.filter(r => r.type === filter);

  return (
    <div className="min-h-screen bg-[#F7F8FA] pb-20">
      {/* Header */}
      <div className="bg-white p-4 sticky top-0 z-10">
        <h1 className="text-[22px] font-extrabold">Rentals</h1>
        <div className="flex gap-2 mt-3 overflow-x-auto">
          {['All','Self-Contain','1-Bedroom','2-Bedroom','3-Bedroom'].map(f=>(
            <button key={f} onClick={()=>setFilter(f)} className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap ${filter===f?'bg-[#0DBF6A] text-white':'bg-gray-100'}`}>{f}</button>
          ))}
        </div>
      </div>

      {/* LIVE AD */}
      <LiveAdPlayer />

      {/* List */}
      <div className="p-4 grid grid-cols-1 gap-4">
        {loading? [1,2,3].map(i=><div key={i} className="h-64 bg-gray-200 rounded-[20px] animate-pulse" />) : filtered.map(r=>(
          <motion.div key={r.id} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className="bg-white rounded-[20px] overflow-hidden shadow-sm">
            <img src={r.images[0]} className="h-[200px] w-full object-cover" />
            <div className="p-4">
              <h3 className="font-bold">{r.title}</h3>
              <p className="text-sm text-gray-500">{r.location} • {r.type}</p>
              <div className="flex justify-between items-center mt-3">
                <p className="font-extrabold text-[#0DBF6A] text-[18px]">₦{r.price.toLocaleString()}</p>
                <button onClick={()=>{localStorage.setItem("selected_rental", JSON.stringify(r)); window.location.href=`/rentals/${r.id}`}} className="bg-black text-white px-4 py-2 rounded-full text-xs">View + Video</button>
              </div>
              {r.videos?.length>0 && <p className="text-[11px] mt-2 text-red-500 font-bold">● {r.videos.length} construction video(s)</p>}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
              }

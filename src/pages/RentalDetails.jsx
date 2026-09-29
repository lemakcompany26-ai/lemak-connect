import VideoUploader from "../components/VideoUploader";
import LiveAdPlayer from "../components/LiveAdPlayer";
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import ConstructionVideos from '../components/ConstructionVideos';

export default function RentalDetails(){
  const { state } = useLocation();
  const navigate = useNavigate();
  const rental = state;
  const [activeImg, setActiveImg] = useState(0);

  if(!rental) return <div className="p-6">No rental selected <button onClick={()=>navigate('/rentals')} className="text-[#0DBF6A]">Go back</button></div>;

  const gallery = rental.images || [
    "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800",
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800",
    "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800",
    "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800",
  ];

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <div className="relative">
        <img src={gallery[activeImg]} className="h-[300px] w-full object-cover" />
        <button onClick={()=>navigate(-1)} className="absolute top-4 left-4 bg-black/40 text-white rounded-full w-9 h-9">←</button>
        <div className="absolute bottom-3 left-3 right-3 flex gap-2 overflow-x-auto">
          {gallery.map((img,i)=>(
            <img key={i} src={img} onClick={()=>setActiveImg(i)} className={`w-14 h-14 rounded-lg object-cover border-2 ${activeImg===i?'border-[#0DBF6A]':'border-white'} cursor-pointer`} />
          ))}
        </div>
      </div>
{/* Only you see this - for uploading */}
<div className="mt-6 border-t pt-4">
  <p className="text-xs font-bold text-gray-400">ADMIN ONLY</p>
  <VideoUploader onUpload={(url)=> console.log("New video url:", url)} />
</div>
      <motion.div initial={{y:20, opacity:0}} animate={{y:0, opacity:1}} className="p-5 -mt-6 bg-white rounded-t-[24px] relative">
        <h1 className="text-[22px] font-bold">{rental.title}</h1>
        <p className="text-gray-500 mt-1">{rental.location} • {rental.type}</p>

        <div className="mt-4 p-4 bg-[#F0FFF6] rounded-xl border border-[#0DBF6A]/20 flex justify-between items-center">
          <div><p className="text-sm text-gray-600">Price</p><p className="text-[24px] font-extrabold text-[#0DBF6A]">₦{rental.price?.toLocaleString()}</p></div>
          <span className="bg-[#0DBF6A] text-white text-xs px-3 py-1 rounded-full">Available</span>
        </div>

        {/* PHOTOS GRID */}
        <h3 className="font-bold mt-6 mb-2">📸 Available Houses (Inside)</h3>
        <div className="grid grid-cols-3 gap-2">
          {gallery.map((g,i)=><img key={i} src={g} className="h-24 w-full object-cover rounded-xl" />)}
        </div>

        {/* CONSTRUCTION VIDEOS */}
        <ConstructionVideos />

        <button className="w-full bg-[#0DBF6A] text-white py-4 rounded-full font-bold mt-6">Contact Owner on WhatsApp</button>
      </motion.div>
    </div>
  )
        }

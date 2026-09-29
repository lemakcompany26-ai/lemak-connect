import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function RentalDetails(){
  const { state } = useLocation();
  const navigate = useNavigate();
  const rental = state;

  if(!rental) return <div className="p-6">No rental selected</div>;

  return (
    <div className="min-h-screen bg-white">
      <div className="relative">
        <img src={rental.images?.[0]} className="h-[300px] w-full object-cover" />
        <button onClick={()=>navigate(-1)} className="absolute top-4 left-4 bg-black/40 text-white rounded-full w-9 h-9">←</button>
      </div>
      <motion.div initial={{y:20, opacity:0}} animate={{y:0, opacity:1}} className="p-5 -mt-6 bg-white rounded-t-[24px] relative">
        <h1 className="text-[22px] font-bold">{rental.title}</h1>
        <p className="text-gray-500 mt-1">{rental.location} • {rental.type}</p>
        <div className="mt-4 p-4 bg-[#F0FFF6] rounded-xl border border-[#0DBF6A]/20">
          <p className="text-sm text-gray-600">Price</p>
          <p className="text-[24px] font-extrabold text-[#0DBF6A]">₦{rental.price?.toLocaleString()}</p>
        </div>
        <button className="w-full bg-[#0DBF6A] text-white py-4 rounded-full font-bold mt-6">Contact Owner</button>
      </motion.div>
    </div>
  )
}

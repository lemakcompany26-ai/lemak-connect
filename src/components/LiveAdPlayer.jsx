import React from 'react';
import { motion } from 'framer-motion';

export default function LiveAdPlayer(){
  return (
    <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} className="mx-4 mt-4 bg-gradient-to-r from-[#0DBF6A] to-[#0AA85E] rounded-[20px] p-[1px]">
      <div className="bg-black rounded-[19px] overflow-hidden relative">
        {/* Auto-playing Ad */}
        <video
          autoPlay muted loop playsInline
          className="w-full h-[180px] object-cover"
          poster="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600"
          src="https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4"
        />
        <div className="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-bold px-3 py-1 rounded-full animate-pulse">
          ● LIVE ADVERT
        </div>
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
          <p className="text-white font-bold text-[15px]">New Estate in Ibadan - 30% OFF!</p>
          <p className="text-white/70 text-[12px]">Watch construction live • Tap to book inspection</p>
        </div>
      </div>
    </motion.div>
  )
}

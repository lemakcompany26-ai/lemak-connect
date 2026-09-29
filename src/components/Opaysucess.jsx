import React from 'react';
import { motion } from 'framer-motion';

export default function OpaySuccess(){
  return (
    <div className="flex flex-col items-center py-10">
      <motion.div
        initial={{scale:0}} animate={{scale:1}}
        transition={{type:"spring", stiffness:260, damping:20}}
        className="w-24 h-24 bg-[#0DBF6A] rounded-full flex items-center justify-center"
      >
        <span className="text-white text-[40px]">✓</span>
      </motion.div>
      <motion.h2 initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:0.2}} className="text-[22px] font-bold mt-4">
        Successful!
      </motion.h2>
      <p className="text-gray-500 text-sm mt-1">Your rental booking confirmed</p>

      {/* Opay style confetti dots */}
      <div className="flex gap-2 mt-6">
        <div className="w-2 h-2 bg-[#0DBF6A] rounded-full animate-bounce"></div>
        <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce delay-100"></div>
        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-200"></div>
      </div>
    </div>
  );
}

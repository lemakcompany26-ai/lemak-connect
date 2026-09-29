import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function OpayBottomSheet({ open, onClose, children }){
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={onClose} className="fixed inset-0 bg-black/40 z-40" />
          <motion.div initial={{y:"100%"}} animate={{y:0}} exit={{y:"100%"}} transition={{type:"spring", damping:25, stiffness:300}} className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[28px] p-6 z-50 max-h-[85vh] overflow-y-auto">
            <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4"></div>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

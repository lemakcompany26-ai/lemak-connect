import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const DATA = {
  chairs: { name:'Plastic Chairs', price:50, unit:'/pc/day', images:['https://images.unsplash.com/photo-1503602642458-232111445657?w=600','https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600'] },
  canopies: { name:'Canopies & Tents', price:5000, unit:'/set/day', images:['https://images.unsplash.com/photo-1469371670807-013ccf25f16a?w=600'] },
  sound: { name:'Sound System', price:10000, unit:'/day', images:['https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600'] },
};

export default function EventDetails(){
  const { id } = useParams();
  const navigate = useNavigate();
  const item = DATA[id] || { name:id, price:1000, unit:'/day', images:['https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=600'] };
  const [qty, setQty] = useState(1);
  const [img, setImg] = useState(item.images[0]);

  return (
    <div className="min-h-screen bg-[#EAF4FF] pb-[100px]">
      <div className="px-4 py-3 bg-white flex items-center gap-3">
        <button onClick={()=>navigate(-1)} className="w-8 h-8 bg-slate-100 rounded-full">‹</button>
        <p className="font-black">{item.name}</p>
      </div>

      <img src={img} alt={item.name} className="w-full h-[260px] object-cover" />
      <div className="flex gap-2 px-3 mt-2">
        {item.images.map((im,i)=>(
          <img key={i} onClick={()=>setImg(im)} src={im} className={`w-14 h-14 rounded-xl object-cover border-2 ${img===im?'border-blue-600':'border-white'}`} alt="" />
        ))}
      </div>

      <div className="m-3 bg-white rounded-[20px] p-4">
        <p className="font-black text-[16px]">{item.name}</p>
        <p className="text-[12px] text-slate-500 mt-1">Clean, strong, ready for events. Delivery & pickup included.</p>
        <p className="font-black text-[18px] mt-3 text-blue-600">₦{item.price.toLocaleString()} <span className="text-[11px] text-slate-500 font-normal">{item.unit}</span></p>

        <div className="flex items-center gap-4 mt-4">
          <p className="text-[12px] font-bold">Qty:</p>
          <div className="flex items-center gap-3 bg-slate-100 rounded-full px-3 py-1">
            <button onClick={()=>setQty(Math.max(1,qty-1))} className="w-7 h-7 bg-white rounded-full font-bold">-</button>
            <span className="font-bold text-[14px]">{qty}</span>
            <button onClick={()=>setQty(qty+1)} className="w-7 h-7 bg-white rounded-full font-bold">+</button>
          </div>
          <p className="ml-auto font-black">₦{(item.price*qty).toLocaleString()}</p>
        </div>

        <button className="w-full mt-5 bg-blue-600 text-white py-3.5 rounded-full font-bold">Book Now - Pay on Delivery</button>
        <p className="text-center text-[10px] text-slate-400 mt-2">Pictures only - no video. Real photos of equipment.</p>
      </div>
    </div>
  );
}

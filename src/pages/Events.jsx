import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function Events(){
  const navigate = useNavigate();
  const categories = [
    { id:'chairs', name:'Chairs', icon:'🪑', count:'500+ pcs', price:'From ₦50', color:'bg-blue-500', img:'https://images.unsplash.com/photo-1503602642458-232111445657?w=600' },
    { id:'tables', name:'Tables', icon:'🪵', count:'100+ pcs', price:'From ₦500', color:'bg-amber-500', img:'https://images.unsplash.com/photo-1533090484-07cc94c8a6f1?w=600' },
    { id:'canopies', name:'Canopies & Tents', icon:'⛺', count:'20+ sets', price:'From ₦5,000', color:'bg-green-500', img:'https://images.unsplash.com/photo-1469371670807-013ccf25f16a?w=600' },
    { id:'sound', name:'Sound System', icon:'🔊', count:'Full PA', price:'From ₦10,000', color:'bg-purple-500', img:'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600' },
    { id:'lighting', name:'Lighting & Effects', icon:'💡', count:'Stage lights', price:'From ₦3,000', color:'bg-yellow-500', img:'https://images.unsplash.com/photo-1516450360452-9312abbf6f7e?w=600' },
    { id:'decor', name:'Decor & Stage', icon:'🎨', count:'Custom', price:'From ₦15,000', color:'bg-pink-500', img:'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=600' },
    { id:'coolers', name:'Coolers & Serving', icon:'🍹', count:'50+ sets', price:'From ₦2,000', color:'bg-cyan-500', img:'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600' },
    { id:'generators', name:'Generators', icon:'⚡', count:'5KVA+', price:'From ₦8,000', color:'bg-slate-700', img:'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=600' },
  ];

  return (
    <div className="min-h-screen bg-[#EAF4FF] pb-[100px]">
      <div className="px-4 py-3 bg-white flex items-center gap-3 sticky top-0 z-20 shadow-sm">
        <button onClick={()=>navigate(-1)} className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center font-bold">‹</button>
        <div>
          <p className="font-black text-[15px]">Events & Party Rentals</p>
          <p className="text-[10px] text-slate-500">All party equipment in Ibadan</p>
        </div>
      </div>

      <div className="m-3 bg-blue-600 rounded-[18px] p-4 text-white flex justify-between items-center">
        <div>
          <p className="font-black text-[14px]">Full Party Package 🎉</p>
          <p className="text-[11px] mt-1 opacity-90">Chairs + Canopy + Tables + Sound</p>
          <p className="text-[12px] font-bold mt-2">₦35,000 per day</p>
        </div>
        <Link to="/events/package" className="bg-white text-blue-600 px-5 py-2.5 rounded-full text-[11px] font-black">Book Now</Link>
      </div>

      <div className="px-3 grid grid-cols-2 gap-3">
        {categories.map(cat=>(
          <Link key={cat.id} to={`/events/${cat.id}`} className="bg-white rounded-[20px] overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-white">
            <img src={cat.img} alt={cat.name} className="w-full h-[90px] object-cover" />
            <div className="p-3">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 ${cat.color} rounded-[9px] flex items-center justify-center text-white text-[14px]`}>{cat.icon}</div>
                <p className="font-extrabold text-[12px] leading-tight">{cat.name}</p>
              </div>
              <p className="text-[10px] text-slate-500 mt-2">{cat.count}</p>
              <p className="text-[11px] text-green-600 font-bold">{cat.price}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
      }

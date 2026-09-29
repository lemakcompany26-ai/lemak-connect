import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function RentalDetails(){
  const { state } = useLocation();
  const navigate = useNavigate();
  const rental = state;
  const [activeImg, setActiveImg] = useState(0);

  if(!rental) return (
    <div className="p-6 min-h-screen bg-[#EAF4FF]">
      <button onClick={()=>navigate(-1)} className="bg-white px-4 py-2 rounded-full font-bold text-sm">← Back</button>
      <p className="mt-4 font-bold">No rental selected. Go back to rentals.</p>
    </div>
  );

  const gallery = rental.images || [
    "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9",
    "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c",
    "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea",
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c"
  ];

  return (
    <div className="min-h-screen bg-[#EAF4FF] pb-[90px]">
      <div className="p-3">
        <button onClick={()=>navigate(-1)} className="bg-white px-4 py-2 rounded-full font-bold text-sm shadow">← Back</button>
      </div>
      <img src={gallery[activeImg]} className="w-full h-[250px] object-cover" alt="rental" />
      <div className="flex gap-2 p-3 overflow-x-auto">
        {gallery.map((img,i)=>(
          <img key={i} onClick={()=>setActiveImg(i)} src={img} className={`w-[70px] h-[70px] rounded-[12px] object-cover border-2 ${i===activeImg?'border-blue-600':'border-white'}`} />
        ))}
      </div>
      <div className="bg-white m-3 rounded-[16px] p-4">
        <h1 className="font-extrabold text-[16px]">{rental.title || '2 Bedroom Apartment'}</h1>
        <p className="text-green-600 font-bold mt-1">₦{rental.price || '500,000'} / year</p>
        <p className="text-[12px] text-gray-500 mt-2">{rental.location || 'Ibadan'}</p>
        <p className="text-[13px] mt-3">{rental.description || 'Clean house with water and light. Contact landlord.'}</p>
      </div>
    </div>
  );
}

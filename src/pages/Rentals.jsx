import React from 'react';
import { Link } from 'react-router-dom';

export default function Rentals(){
  return (
    <div className="min-h-screen bg-[#EAF4FF] p-4 pb-[90px]">
      <h1 className="text-[18px] font-extrabold">Rentals</h1>
      <p className="text-[12px] text-gray-500 mt-1">Houses, events, water, power, fumigation</p>

      <div className="mt-4">
        <video autoPlay muted loop playsInline className="w-full h-[200px] rounded-[16px] bg-black object-cover" src="https://www.w3schools.com/html/mov_bbb.mp4" />
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4">
        <Link to="/rentals/1" className="bg-white rounded-[16px] p-3 shadow-sm">
          <div className="w-full h-[100px] bg-gray-200 rounded-[12px]"></div>
          <p className="font-bold text-[12px] mt-2">2 Bedroom - Ibadan</p>
          <p className="text-[11px] text-green-600 font-bold">₦500k / year</p>
        </Link>
        <Link to="/rentals/2" className="bg-white rounded-[16px] p-3 shadow-sm">
          <div className="w-full h-[100px] bg-gray-200 rounded-[12px]"></div>
          <p className="font-bold text-[12px] mt-2">Shop - Lagos</p>
          <p className="text-[11px] text-green-600 font-bold">₦300k / year</p>
        </Link>
      </div>
    </div>
  )
}

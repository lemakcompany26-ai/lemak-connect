import React from 'react';
import { Link } from 'react-router-dom';

export default function Dashboard(){
  const services = [
    { to:'/app/airtime', label:'Airtime', bg:'bg-blue-500' },
    { to:'/app/data', label:'Data', bg:'bg-green-500' },
    { to:'/app/electricity', label:'Electricity', bg:'bg-yellow-500' },
    { to:'/app/cable', label:'Cable TV', bg:'bg-purple-500' },
    { to:'/app/betting', label:'Betting', bg:'bg-red-500' },
    { to:'/app/education', label:'Education', bg:'bg-blue-600' },
    { to:'/app/epin', label:'ePIN', bg:'bg-orange-500' },
    { to:'/app/broadband', label:'Broadband', bg:'bg-green-600' },
    { to:'/app/virtual-numbers', label:'Virtual Numbers', bg:'bg-indigo-600' },
    { to:'/rentals', label:'Rentals', bg:'bg-purple-700' },
  ];

  return (
    <div className="min-h-screen bg-[#EAF4FF] pb-[100px]">
      <div className="bg-[#EAF4FF] px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">L</div>
          <p className="font-extrabold text-[16px]">Lemak Connect</p>
        </div>
        <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">L</div>
      </div>

      <div className="px-3 mt-2">
        <div className="w-full h-[160px] bg-black rounded-[16px] flex items-center justify-center text-white">
          <video autoPlay muted loop playsInline className="w-full h-full object-cover rounded-[16px]" src="https://www.w3schools.com/html/mov_bbb.mp4" />
        </div>
      </div>

      <div className="px-3 mt-4 grid grid-cols-3 gap-3">
        {services.map(s=>(
          <Link key={s.to} to={s.to} className="bg-white rounded-[18px] h-[110px] flex flex-col items-center justify-center shadow-sm">
            <div className={`w-[50px] h-[50px] ${s.bg} rounded-[14px]`}></div>
            <p className="text-[12px] font-bold mt-2">{s.label}</p>
          </Link>
        ))}
      </div>

      <div className="px-3 mt-6">
        <p className="text-[12px] font-bold text-gray-500">VIRTUAL NUMBERS & OTP</p>
        <div className="grid grid-cols-3 gap-3 mt-2">
          <div className="bg-white rounded-[18px] h-[110px]"></div>
          <div className="bg-white rounded-[18px] h-[110px]"></div>
          <div className="bg-white rounded-[18px] h-[110px]"></div>
        </div>
      </div>
    </div>
  )
      }

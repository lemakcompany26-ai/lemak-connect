import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import OpaySuccess from '@/components/OpaySuccess';
import OpayBottomSheet from '@/components/OpayBottomSheet';
import ShimmerCard from '@/components/ShimmerCard';

export default function Rentals() {
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    fetchRentals();
  }, [filter]);

  const fetchRentals = async () => {
    setLoading(true);
    try {
      const url = filter === 'all'? '/api/rentals' : `/api/rentals?type=${filter}`;
      const res = await fetch(url);
      const data = await res.json();
      setRentals(data.rentals || []);
    } catch (e) {
      console.log(e);
    }
    setLoading(false);
  };

  const handleBook = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/rentals/${selected.id}/book`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if(res.ok){
      setShowSuccess(true);
      setTimeout(()=>{ setSelected(null); setShowSuccess(false); }, 2500);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-20">
      {/* Opay Header */}
      <div className="bg-white p-4 sticky top-0 z-10">
        <h1 className="text-[20px] font-bold">Rentals</h1>
        <div className="flex gap-2 mt-4 overflow-x-auto">
          {['all','apartment','car','shop'].map((t)=>(
            <motion.button
              key={t}
              whileTap={{scale:0.92}}
              onClick={()=>setFilter(t)}
              className={`px-5 py-2 rounded-full text-sm font-semibold capitalize whitespace-nowrap ${filter===t? 'bg-[#0DBF6A] text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              {t}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-3 p-4">
        {loading? (

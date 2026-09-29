import React from 'react';

export default function ShimmerCard(){
  return (
    <div className="bg-white rounded-[16px] p-3 animate-pulse">
      <div className="h-32 bg-gray-200 rounded-xl mb-3"></div>
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
      <div className="h-3 bg-[#E6F9EF] rounded w-1/3 mt-3"></div>
    </div>
  );
}

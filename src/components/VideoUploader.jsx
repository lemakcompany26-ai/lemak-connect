import React, { useState } from 'react';
import { motion } from 'framer-motion';

export default function VideoUploader({ onUpload }){
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if(!file) return;

    // Preview instantly
    const url = URL.createObjectURL(file);
    setPreview(url);
    setUploading(true);

    // --- OPTION 1: Upload to Cloudinary (FREE) ---
    // 1. Go to cloudinary.com -> sign up free -> Settings -> Upload -> Add upload preset -> Unsigned
    // 2. Replace CLOUD_NAME and PRESET below
    const CLOUD_NAME = "YOUR_CLOUD_NAME"; // e.g dxyz123
    const PRESET = "YOUR_UNSIGNED_PRESET"; // e.g lemak_upload

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("upload_preset", PRESET);
      // For testing without Cloudinary yet, we just use local preview
      // const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`, { method: "POST", body: form });
      // const data = await res.json();
      // onUpload(data.secure_url);

      // TEMP - works offline for now
      setTimeout(()=>{
        onUpload(url);
        setUploading(false);
        alert("Video added! (Will be permanent after you set Cloudinary)");
      }, 1500);
    } catch(err){
      setUploading(false);
      alert("Upload failed");
    }
  };

  return (
    <div className="mt-4 p-4 border-2 border-dashed border-[#0DBF6A]/30 rounded-[16px] bg-[#F0FFF6]">
      <p className="font-bold text-sm mb-2">📹 Upload Construction Video</p>
      {preview && <video src={preview} controls className="w-full h-[180px] rounded-xl mb-3 object-cover" />}

      <label className="w-full bg-[#0DBF6A] text-white py-3 rounded-full font-bold text-center block cursor-pointer">
        {uploading? "Uploading..." : "Choose Video / Record"}
        <input type="file" accept="video/*" capture="environment" onChange={handleFile} className="hidden" />
      </label>
      <p className="text-[11px] text-gray-500 mt-2 text-center">Supports mp4, 3gp - Record from camera or gallery</p>
    </div>
  )
}

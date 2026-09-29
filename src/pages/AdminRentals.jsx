import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AdminRentals(){
  const navigate = useNavigate();
  const [form, setForm] = useState({ title:"", location:"Ibadan", price:"", type:"Self-Contain", description:"" });
  const [images, setImages] = useState([]);
  const [videos, setVideos] = useState([]);
  const [rentals, setRentals] = useState([]);

  useEffect(()=>{
    const saved = JSON.parse(localStorage.getItem("lemak_rentals") || "[]");
    setRentals(saved);
  },[]);

  const handleImage = (e)=>{
    const files = Array.from(e.target.files);
    files.forEach(f=>{
      const url = URL.createObjectURL(f);
      setImages(prev=>[...prev, url]);
    });
  };

  const handleVideo = (e)=>{
    const files = Array.from(e.target.files);
    files.forEach(f=>{
      const url = URL.createObjectURL(f);
      setVideos(prev=>[...prev, { title: f.name, url, thumb: "" }]);
    });
  };

  const handleSave = ()=>{
    if(!form.title ||!form.price){ alert("Add title and price"); return; }
    const newRental = {
      id: Date.now(),
     ...form,
      price: Number(form.price),
      images: images.length? images : ["https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800"],
      videos: videos,
      createdAt: new Date().toISOString()
    };
    const updated = [newRental,...rentals];
    localStorage.setItem("lemak_rentals", JSON.stringify(updated));
    alert("Rental Added! Live now in /rentals");
    setForm({ title:"", location:"Ibadan", price:"", type:"Self-Contain", description:"" });
    setImages([]); setVideos([]);
    setRentals(updated);
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] p-4">
      <button onClick={()=>navigate("/rentals")} className="mb-4 bg-black text-white px-4 py-2 rounded-full text-sm">← View Rentals</button>

      <h1 className="text-[22px] font-extrabold">Admin - Add Rental</h1>
      <p className="text-sm text-gray-500">Upload from your phone, appears live instantly</p>

      <div className="bg-white rounded-[20px] p-4 mt-4 space-y-3">
        <input value={form.title} onChange={e=>setForm({...form, title:e.target.value})} placeholder="Title: e.g 2-Bed Flat in Bodija" className="w-full border rounded-full px-4 py-3 text-sm" />
        <div className="grid grid-cols-2 gap-3">
          <input value={form.location} onChange={e=>setForm({...form, location:e.target.value})} placeholder="Location" className="border rounded-full px-4 py-3 text-sm" />
          <input value={form.price} onChange={e=>setForm({...form, price:e.target.value})} type="number" placeholder="Price e.g 500000" className="border rounded-full px-4 py-3 text-sm" />
        </div>
        <select value={form.type} onChange={e=>setForm({...form, type:e.target.value})} className="w-full border rounded-full px-4 py-3 text-sm">
          <option>Self-Contain</option><option>1-Bedroom</option><option>2-Bedroom</option><option>3-Bedroom</option><option>Duplex</option><option>Shop</option>
        </select>
        <textarea value={form.description} onChange={e=>setForm({...form, description:e.target.value})} placeholder="Description, e.g Water, light, etc" className="w-full border rounded-[16px] px-4 py-3 text-sm h-20"></textarea>

        {/* IMAGE UPLOAD */}
        <div className="border-2 border-dashed rounded-[16px] p-3">
          <p className="font-bold text-sm">📸 House Photos ({images.length})</p>
          <div className="flex gap-2 mt-2 overflow-x-auto">
            {images.map((img,i)=><img key={i} src={img} className="w-16 h-16 rounded-lg object-cover" />)}
          </div>
          <label className="mt-2 bg-[#F0FFF6] border border-[#0DBF6A] text-[#0DBF6A] py-2 rounded-full text-sm font-bold block text-center cursor-pointer">
            + Add Photos
            <input type="file" multiple accept="image/*" onChange={handleImage} className="hidden" />
          </label>
        </div>

        {/* VIDEO UPLOAD */}
        <div className="border-2 border-dashed rounded-[16px] p-3">
          <p className="font-bold text-sm">🎥 Construction Videos ({videos.length})</p>
          <div className="flex gap-2 mt-2 overflow-x-auto">
            {videos.map((v,i)=><video key={i} src={v.url} className="w-24 h-16 rounded-lg object-cover" />)}
          </div>
          <label className="mt-2 bg-black text-white py-2 rounded-full text-sm font-bold block text-center cursor-pointer">
            + Add / Record Video
            <input type="file" multiple accept="video/*" capture="environment" onChange={handleVideo} className="hidden" />
          </label>
        </div>

        <button onClick={handleSave} className="w-full bg-[#0DBF6A] text-white py-4 rounded-full font-extrabold">Publish Rental LIVE</button>
      </div>

      {/* LIST */}
      <h2 className="font-bold mt-6">Your Rentals ({rentals.length})</h2>
      {rentals.map(r=>(
        <div key={r.id} className="bg-white rounded-xl p-3 mt-2 flex gap-3">
          <img src={r.images[0]} className="w-16 h-16 rounded-lg object-cover" />
          <div><p className="font-bold text-sm">{r.title}</p><p className="text-xs text-gray-500">{r.location} • ₦{r.price?.toLocaleString()}</p></div>
        </div>
      ))}
    </div>
  )
      }

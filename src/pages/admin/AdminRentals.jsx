import React, { useState } from 'react';

export default function AdminRentals(){
  const [items, setItems] = useState([
    { id:1, name:'White Plastic Chairs', price:'₦50', image:'https://images.unsplash.com/photo-1503602642458-232111445657?w=400' },
    { id:2, name:'Canopy 10x10', price:'₦5,000', image:'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=400' },
  ]);
  const [form, setForm] = useState({ name:'', price:'', image:'' });
  const [preview, setPreview] = useState('');

  const handleImage = (e)=>{
    const file = e.target.files[0];
    if(!file) return;
    // Only pictures
    if(!file.type.startsWith('image/')){
      alert('Only pictures allowed, no video!');
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    setForm({...form, image: url});
  };

  const addItem = ()=>{
    if(!form.name ||!form.price ||!form.image){
      alert('Fill all + upload picture');
      return;
    }
    setItems([...items, { id: Date.now(),...form }]);
    setForm({ name:'', price:'', image:'' });
    setPreview('');
  };

  const deleteItem = (id)=>{
    setItems(items.filter(i=>i.id!==id));
  };

  return (
    <div className="min-h-screen bg-[#F5F7FB] p-4">
      <h1 className="font-extrabold text-[18px]">Admin - Party Equipment Pictures Only</h1>
      <p className="text-[12px] text-gray-500">Upload party equipment photos (JPG, PNG) - Video disabled</p>

      {/* Upload Form */}
      <div className="mt-4 bg-white rounded-[16px] p-4 border shadow-sm">
        <p className="font-bold text-[14px]">Add New Equipment</p>

        <input
          placeholder="Equipment Name e.g. Chairs"
          value={form.name}
          onChange={e=>setForm({...form, name:e.target.value})}
          className="w-full mt-3 border rounded-xl px-3 py-2.5 text-[13px]"
        />
        <input
          placeholder="Price e.g. ₦50 per day"
          value={form.price}
          onChange={e=>setForm({...form, price:e.target.value})}
          className="w-full mt-3 border rounded-xl px-3 py-2.5 text-[13px]"
        />

        {/* PICTURE UPLOAD ONLY */}
        <div className="mt-3 border-2 border-dashed rounded-xl p-4 text-center bg-gray-50">
          <p className="text-[12px] font-bold">Upload Picture (No Video)</p>
          <input type="file" accept="image/*" onChange={handleImage} className="mt-2 text-[11px]" />
          <p className="text-[10px] text-gray-400 mt-1">Only JPG, PNG, WEBP allowed</p>
          {preview && <img src={preview} alt="preview" className="w-full h-40 object-cover rounded-xl mt-3" />}
        </div>

        <button onClick={addItem} className="w-full mt-4 bg-blue-600 text-white py-3 rounded-full font-bold text-[13px]">Upload Equipment</button>
      </div>

      {/* List */}
      <div className="mt-6 grid grid-cols-2 gap-3">
        {items.map(it=>(
          <div key={it.id} className="bg-white rounded-[16px] overflow-hidden border shadow-sm">
            <img src={it.image} alt={it.name} className="w-full h-28 object-cover" />
            <div className="p-3">
              <p className="font-bold text-[12px]">{it.name}</p>
              <p className="text-[11px] text-green-600">{it.price}</p>
              <button onClick={()=>deleteItem(it.id)} className="mt-2 w-full bg-red-50 text-red-600 py-1.5 rounded-full text-[11px] font-bold">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
    }

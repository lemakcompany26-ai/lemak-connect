import React, { useState } from 'react';

export default function AdminEvents(){
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ name:'', price:'', category:'chairs' });
  const [preview, setPreview] = useState('');

  const handleImage = (e)=>{
    const file = e.target.files[0];
    if(!file) return;
    if(!file.type.startsWith('image/')){
      alert('❌ Video not allowed! Only pictures of party equipment.');
      return;
    }
    setPreview(URL.createObjectURL(file));
  };

  return (
    <div className="min-h-screen bg-[#F5F7FB] p-4">
      <h1 className="font-black">Admin - Events & Party Equipment (Picture Only)</h1>
      <div className="mt-4 bg-white rounded-[16px] p-4">
        <select value={form.category} onChange={e=>setForm({...form, category:e.target.value})} className="w-full border rounded-xl p-2.5 text-[13px]">
          <option value="chairs">Chairs</option>
          <option value="tables">Tables</option>
          <option value="canopies">Canopies & Tents</option>
          <option value="sound">Sound System</option>
          <option value="lighting">Lighting</option>
          <option value="decor">Decor & Stage</option>
        </select>
        <input placeholder="Name" className="w-full mt-3 border rounded-xl p-2.5 text-[13px]" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} />
        <input placeholder="Price e.g. 50" type="number" className="w-full mt-3 border rounded-xl p-2.5 text-[13px]" value={form.price} onChange={e=>setForm({...form, price:e.target.value})} />
        <div className="mt-3 border-2 border-dashed rounded-xl p-4 text-center">
          <p className="text-[11px] font-bold">Upload Equipment Picture (JPG/PNG Only)</p>
          <input type="file" accept="image/*" onChange={handleImage} className="mt-2 text-[11px]" />
          {preview && <img src={preview} alt="" className="w-full h-40 object-cover rounded-xl mt-3" />}
        </div>
        <button onClick={()=>{ if(!preview)return alert('Upload picture'); setItems([...items,{...form, img:preview, id:Date.now()}]); setPreview(''); }} className="w-full mt-4 bg-blue-600 text-white py-3 rounded-full font-bold text-[13px]">Upload</button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {items.map(i=>(
          <div key={i.id} className="bg-white rounded-xl overflow-hidden">
            <img src={i.img} className="w-full h-24 object-cover" alt="" />
            <div className="p-2"><p className="font-bold text-[11px]">{i.name}</p><p className="text-[10px] text-green-600">₦{i.price}</p></div>
          </div>
        ))}
      </div>
    </div>
  );
            }

import { useEffect, useState } from "react";
export default function Landing(){
const [showAndroidPopup, setShowAndroidPopup] = useState(false);
const PLAY_STORE_LINK = "https://play.google.com/store/apps/details?id=com.lemakconnect.app"; // CHANGE THIS TO YOUR REAL LINK WHEN LIVE

useEffect(()=>{
  document.title = "Lemak Connect - Cheap Data, Airtime & Bills Payment in Nigeria";
  let meta = document.querySelector('meta[name="description"]');
  if(!meta){ meta = document.createElement('meta'); meta.name="description"; document.head.appendChild(meta); }
  meta.content = "Buy cheapest MTN, Airtel, Glo, 9mobile data, airtime VTU, pay NEPA, DSTV, GOTV instantly.";
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.innerHTML = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Lemak Connect",
    "url": "https://www.lemakconnect.com",
    "logo": "https://www.lemakconnect.com/logo.png"
  });
  document.head.appendChild(script);

  // Android detection
  const isAndroid = /Android/i.test(navigator.userAgent);
  const hasSeenPopup = localStorage.getItem('seenAndroidPopup');
  if(isAndroid &&!hasSeenPopup){
    setTimeout(()=> setShowAndroidPopup(true), 2000);
  }
},[]);

return (
<div className="min-h-screen bg-white font-sans relative">
  {/* ANDROID POPUP */}
  {showAndroidPopup && (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl animate-in">
        <div className="text-5xl mb-3">📱</div>
        <h3 className="text-xl font-black">Get Our Android App!</h3>
        <p className="text-gray-600 text-sm mt-2">Faster, lightweight, get instant notifications for cheap data deals.</p>
        <div className="mt-6 flex flex-col gap-3">
          <a href={PLAY_STORE_LINK} target="_blank" className="bg-black text-white py-3 rounded-full font-bold">Download on Play Store</a>
          <button onClick={()=>{localStorage.setItem('seenAndroidPopup','1'); setShowAndroidPopup(false);}} className="text-gray-500 text-sm py-2">Continue on Website</button>
        </div>
      </div>
    </div>
  )}

  <nav className="flex justify-between items-center p-4 md:px-12 border-b sticky top-0 bg-white/90 backdrop-blur z-50">
    <div className="font-black text-xl text-blue-600">LEMAK CONNECT</div>
    <div className="flex gap-3">
      <a href="/login" className="px-5 py-2 text-sm font-bold">Login</a>
      <a href="/login" className="px-6 py-2 bg-blue-600 text-white rounded-full text-sm font-bold">Get Started</a>
    </div>
  </nav>
  <section className="text-center px-6 py-16 md:py-24 bg-gradient-to-b from-blue-50 to-white">
    <span className="bg-blue-100 text-blue-600 px-4 py-1 rounded-full text-xs font-bold">🇳🇬 TRUSTED BY 50,000+ NIGERIANS</span>
    <h1 className="text-4xl md:text-6xl font-black mt-6 leading-tight">Buy Cheap Data, Airtime<br/>Pay Bills <span className="text-blue-600">Instantly</span></h1>
    <p className="text-gray-600 mt-4 max-w-2xl mx-auto text-lg">Cheapest MTN, Airtel, Glo, 9mobile data bundles, airtime VTU, NEPA, DSTV, GOTV. 5 seconds delivery, 24/7 support.</p>
    <div className="mt-8 flex flex-col items-center gap-4">
      <div className="flex flex-col md:flex-row justify-center items-center gap-4">
        <a href="/login" className="px-8 py-4 bg-blue-600 text-white rounded-full font-bold text-lg shadow-lg hover:bg-blue-700">Start Buying Now →</a>
        <a href={PLAY_STORE_LINK} target="_blank">
          <img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" alt="Get it on Google Play" className="h-14" />
        </a>
      </div>
      <p className="text-xs text-gray-500">Also available on Android</p>
    </div>
  </section>
  <section className="px-6 md:px-12 py-12 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-6xl mx-auto">
    {[
      ["📱 Cheap Data","MTN 1GB ₦280","bg-blue-50"],
      ["⚡ Airtime VTU","Instant top-up","bg-green-50"],
      ["💡 Bills Payment","NEPA, DSTV, GOTV","bg-yellow-50"],
      ["🔢 Virtual Number","For WhatsApp OTP","bg-purple-50"],
    ].map(([t,d,c])=>(
      <div key={t} className={`${c} p-6 rounded-2xl border`}><div className="font-black">{t}</div><div className="text-sm text-gray-600 mt-2">{d}</div></div>
    ))}
  </section>
  <footer className="text-center py-10 text-sm text-gray-500 border-t"><div className="font-black text-black">LEMAK CONNECT</div><div className="mt-2">© 2026 Lemak Connect - 09022143559 - www.lemakconnect.com</div></footer>

  <a href="https://wa.me/2349022143559?text=Hello%20Lemak%20Connect%2C%20I%20want%20to%20buy%20cheap%20data" target="_blank" className="fixed bottom-6 right-6 bg-green-500 text-white px-5 py-3 rounded-full shadow-2xl flex items-center gap-2 font-bold z-50">
    <span className="text-xl">💬</span> WhatsApp Us
  </a>
</div>
)}

import React from "react";
export default function Landing() {
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      {/* SEO FOR GOOGLE */}
      <title>Lemak Connect - Cheapest Data & VTU in Nigeria</title>
      <meta name="description" content="Buy cheapest MTN, Airtel, GLO, 9Mobile data, pay NEPA, DSTV, GOTV, buy virtual numbers for OTP, grow TikTok & Instagram in Nigeria. Fast & secure." />

      {/* HERO */}
      <header className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-6 text-center">
        <h1 className="text-3xl font-bold">LEMAK CONNECT</h1>
        <p className="mt-2 text-lg">Your World of Digital Services in One Place</p>
        <p className="mt-4 bg-white/20 p-3 rounded-lg text-sm">
          ✅ Cheap Data & Airtime ✅ NEPA & Cable TV ✅ Virtual Numbers & OTP ✅ TikTok/IG Growth
        </p>
        <a href="https://lemakconnect.com" className="mt-6 inline-block bg-white text-blue-700 font-bold px-8 py-3 rounded-full">
          Download App Now
        </a>
        <p className="text-xs mt-2 opacity-80">Available on Google Play & App Store</p>
      </header>

      {/* SERVICES */}
      <section className="p-6 grid grid-cols-2 gap-4">
        <div className="bg-blue-50 p-4 rounded-xl text-center">
          <h3 className="font-bold">📱 Cheap Data</h3>
          <p className="text-xs mt-1">MTN, Airtel, Glo, 9Mobile from ₦450</p>
        </div>
        <div className="bg-green-50 p-4 rounded-xl text-center">
          <h3 className="font-bold">💡 Bills Payment</h3>
          <p className="text-xs mt-1">NEPA, DSTV, GOTV, Startimes</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-xl text-center">
          <h3 className="font-bold">🔑 Virtual Number</h3>
          <p className="text-xs mt-1">OTP for WhatsApp, Facebook, Gmail</p>
        </div>
        <div className="bg-pink-50 p-4 rounded-xl text-center">
          <h3 className="font-bold">🚀 Social Growth</h3>
          <p className="text-xs mt-1">TikTok, IG, YouTube Likes & Views</p>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gray-900 text-white p-6 text-center">
        <h2 className="text-xl font-bold">Fast. Safe. Affordable. 24/7 Support.</h2>
        <p className="text-sm mt-2 opacity-70">Trusted by thousands in Ibadan & Nigeria</p>
        <a href="https://lemakconnect.com" className="mt-4 inline-block bg-blue-600 px-8 py-3 rounded-full font-bold">
          Start Now - lemakconnect.com
        </a>
      </section>

      <footer className="text-center text-xs p-4 opacity-50">
        © 2026 Lemak Connect - Cheapest VTU in Nigeria
      </footer>
    </div>
  );
}

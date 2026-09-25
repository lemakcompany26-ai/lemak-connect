import React from "react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <header className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-6 text-center">
        <h1 className="text-3xl font-bold">LEMAK CONNECT</h1>
        <p className="mt-2 text-lg">Your World of Digital Services</p>
        <p className="mt-4 bg-white/20 p-3 rounded-lg text-sm">
          ✅ Cheap Data & Airtime ✅ NEPA & Cable TV ✅ Virtual Numbers
        </p>
        <a href="/login" className="mt-6 inline-block bg-white text-blue-700 font-bold px-8 py-3 rounded-full">
          Login to Dashboard
        </a>
      </header>

      <section className="p-6 grid grid-cols-2 gap-4">
        <div className="bg-blue-50 p-4 rounded-xl text-center">
          <h3 className="font-bold">Cheap Data</h3>
          <p className="text-xs mt-1">MTN, Airtel, Glo, 9Mobile</p>
        </div>
        <div className="bg-green-50 p-4 rounded-xl text-center">
          <h3 className="font-bold">Bills Payment</h3>
          <p className="text-xs mt-1">NEPA, DSTV, GOTV</p>
        </div>
      </section>

      <section className="bg-gray-900 text-white p-6 text-center">
        <h2 className="text-xl font-bold">Fast. Safe. Affordable.</h2>
        <a href="/login" className="mt-4 inline-block bg-blue-600 px-8 py-3 rounded-full font-bold">
          Start Now
        </a>
      </section>
    </div>
  );
}

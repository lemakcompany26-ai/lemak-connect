import React, { useState, useEffect } from "react";

const ADS = [
  { bg: "#E8F2FF", icon: "📱", title: "Airtime", sub: "Buy airtime for all networks", color: "#2563EB", link: "/app/airtime", btn: "Buy" },
  { bg: "#F3E8FF", icon: "🌐", title: "Data", sub: "Affordable data", color: "#9333EA", link: "/app/data", btn: "Get Data" },
  { bg: "#FFF4CC", icon: "⚡", title: "Electricity", sub: "Pay PHCN instantly", color: "#EAB308", link: "/app/electricity", btn: "Pay Bill" },
  { bg: "#FFE4E8", icon: "📺", title: "Cable TV", sub: "Renew DStv, GOtv", color: "#DB2777", link: "/app/cable", btn: "Renew" },
  { bg: "#E6F9E6", icon: "🎮", title: "Betting", sub: "Fund betting wallet", color: "#16A34A", link: "/app/betting", btn: "Fund" },
  { bg: "#E8F0FF", icon: "🎬", title: "Subscriptions", sub: "Netflix, Spotify", color: "#1D4ED8", link: "/app/subscriptions", btn: "Subscribe" },
  { bg: "#F5E8FF", icon: "📲", title: "Virtual Numbers", sub: "Get OTP numbers", color: "#7E22CE", link: "/app/virtual-numbers", btn: "Get Number" },
  { bg: "#E0F5F0", icon: "💬", title: "OTP Service", sub: "Receive OTPs", color: "#0D9488", link: "/app/virtual-numbers", btn: "Get OTP" },
  { bg: "#FFE8EC", icon: "📈", title: "SMM Growth", sub: "Likes, views, followers", color: "#EF4444", link: "/app/social-growth", btn: "Grow Now" },
  { bg: "#E6F2FF", icon: "🛒", title: "Marketplace", sub: "Buy & sell safely", color: "#3B82F6", link: "/app/marketplace", btn: "Explore" },
  { bg: "#EDE8FF", icon: "🏠", title: "Rental Services", sub: "Book houses & events", color: "#7C3AED", link: "/rentals", btn: "Book" },
  { bg: "#E6F9E6", icon: "⊞", title: "More Services", sub: "More coming soon", color: "#00B875", link: "/app/services", btn: "View All" },
];

export default function AdSlider() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setCurrent((p) => (p + 1) % ADS.length), 5000);
    return () => clearInterval(id);
  }, []);

  const ad = ADS[current];

  return (
    <div style={{ margin: 12 }}>
      <div style={{ background: ad.bg, borderRadius: 16, padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ width: 44, height: 44, background: "#fff", borderRadius: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{ad.icon}</div>
          <div>
            <div style={{ fontWeight: "bold", fontSize: 14 }}>{ad.title}</div>
            <div style={{ fontSize: 11, color: "#555" }}>{ad.sub}</div>
          </div>
        </div>
        <a href={ad.link} style={{ background: ad.color, color: "#fff", padding: "8px 16px", borderRadius: 20, fontSize: 11, fontWeight: "bold", textDecoration: "none" }}>{ad.btn}</a>
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 4, marginTop: 8 }}>
        {ADS.map((_, i) => (
          <div key={i} style={{ width: i === current? 20 : 6, height: 6, borderRadius: 10, background: i === current? "#00B875" : "#ccc" }}></div>
        ))}
      </div>
    </div>
  );
}

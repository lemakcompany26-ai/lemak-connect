import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const ADS = [
  {
    title: "Airtime",
    description:
      "Recharge MTN, Airtel, Glo and 9mobile.",
    icon: "📱",
    link: "/app/airtime",
    background: "bg-blue-50",
    button: "bg-blue-600",
  },
  {
    title: "Data",
    description:
      "Get affordable data bundles for all networks.",
    icon: "🌐",
    link: "/app/data",
    background: "bg-purple-50",
    button: "bg-purple-600",
  },
  {
    title: "Electricity",
    description:
      "Pay supported electricity bills quickly.",
    icon: "⚡",
    link: "/app/electricity",
    background: "bg-amber-50",
    button: "bg-amber-500",
  },
  {
    title: "Cable TV",
    description:
      "Renew DStv, GOtv, StarTimes and more.",
    icon: "📺",
    link: "/app/cable",
    background: "bg-pink-50",
    button: "bg-pink-600",
  },
  {
    title: "Virtual Numbers",
    description:
      "Get available international numbers and OTP services.",
    icon: "📲",
    link: "/app/virtual-numbers",
    background: "bg-violet-50",
    button: "bg-violet-600",
  },
  {
    title: "Social Growth",
    description:
      "Grow your social media presence with supported services.",
    icon: "📈",
    link: "/app/social-growth",
    background: "bg-emerald-50",
    button: "bg-emerald-600",
  },
  {
    title: "Betting",
    description:
      "Fund supported betting accounts securely.",
    icon: "🏆",
    link: "/app/betting",
    background: "bg-red-50",
    button: "bg-red-600",
  },
  {
    title: "Marketplace",
    description:
      "Explore the LEMAK Connect marketplace.",
    icon: "🛍️",
    link: "/app/marketplace",
    background: "bg-cyan-50",
    button: "bg-cyan-600",
  },
];

const SERVICES = [
  {
    title: "Airtime",
    icon: "📱",
    link: "/app/airtime",
    color: "bg-blue-600",
  },
  {
    title: "Data",
    icon: "🌐",
    link: "/app/data",
    color: "bg-green-600",
  },
  {
    title: "Electricity",
    icon: "⚡",
    link: "/app/electricity",
    color: "bg-amber-500",
  },
  {
    title: "Cable TV",
    icon: "📺",
    link: "/app/cable",
    color: "bg-purple-600",
  },
  {
    title: "Betting",
    icon: "🏆",
    link: "/app/betting",
    color: "bg-red-600",
  },
  {
    title: "Education",
    icon: "🎓",
    link: "/app/education",
    color: "bg-sky-600",
  },
  {
    title: "ePIN",
    icon: "🎟️",
    link: "/app/epin",
    color: "bg-orange-500",
  },
  {
    title: "Broadband",
    icon: "📡",
    link: "/app/broadband",
    color: "bg-emerald-600",
  },
  {
    title: "Virtual Numbers",
    icon: "📲",
    link: "/app/virtual-numbers",
    color: "bg-violet-600",
  },
];

const QUICK_ACTIONS = [
  {
    title: "Wallet",
    description: "Fund and manage your balance",
    icon: "💳",
    link: "/app/wallet",
  },
  {
    title: "Transactions",
    description: "View your transaction history",
    icon: "🧾",
    link: "/app/transactions",
  },
  {
    title: "Marketplace",
    description: "Buy and sell",
    icon: "🛍️",
    link: "/app/marketplace",
  },
  {
    title: "Support",
    description: "Get help from LEMAK",
    icon: "💬",
    link: "/app/support",
  },
];

function AdSlider() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrent((previous) =>
        (previous + 1) % ADS.length
      );
    }, 5000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const ad = ADS[current];

  return (
    <div className="w-full">
      <Link
        to={ad.link}
        className={`
          block rounded-[24px]
          ${ad.background}
          border border-white
          p-5
          shadow-[0_8px_30px_rgba(0,0,0,0.06)]
          transition-all duration-500
        `}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-14 h-14 shrink-0 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm">
              {ad.icon}
            </div>

            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.18em] font-black text-slate-400">
                LEMAK CONNECT
              </p>

              <h2 className="text-[18px] font-black text-slate-900 mt-1">
                {ad.title}
              </h2>

              <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                {ad.description}
              </p>
            </div>
          </div>

          <span
            className={`
              ${ad.button}
              shrink-0
              text-white
              text-[11px]
              font-black
              px-4
              py-2.5
              rounded-full
            `}
          >
            Open
          </span>
        </div>

        <div className="mt-5 flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-400">
            {current + 1} / {ADS.length}
          </span>

          <span className="text-[10px] font-bold text-slate-400">
            Auto-changing
          </span>
        </div>
      </Link>

      <div className="flex justify-center gap-1.5 mt-3">
        {ADS.map((_, index) => (
          <button
            key={index}
            type="button"
            aria-label={`Show advert ${index + 1}`}
            onClick={() => setCurrent(index)}
            className={`
              h-1.5
              rounded-full
              transition-all
              ${
                index === current
                  ? "w-7 bg-blue-600"
                  : "w-1.5 bg-slate-300"
              }
            `}
          />
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-[#EAF4FF] pb-24">

      {/* HEADER */}

      <header className="sticky top-0 z-30 bg-[#EAF4FF]/95 backdrop-blur-md border-b border-white">
        <div className="px-4 py-4 flex items-center justify-between">

          <Link
            to="/app"
            className="flex items-center gap-3"
          >
            <div className="w-11 h-11 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-xl font-black shadow-sm">
              L
            </div>

            <div className="leading-none">
              <p className="text-[17px] font-black text-blue-600">
                LEMAK
              </p>

              <p className="text-[17px] font-black text-slate-900">
                CONNECT
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2">

            <Link
              to="/app/notifications"
              className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm"
              aria-label="Notifications"
            >
              🔔
            </Link>

            <Link
              to="/app/profile"
              className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-black shadow-sm"
              aria-label="Profile"
            >
              L
            </Link>

          </div>
        </div>
      </header>

      {/* CONTENT */}

      <main className="px-3 pt-4">

        {/* ADVERTISEMENT */}

        <AdSlider />

        {/* SERVICES */}

        <section className="mt-7">

          <div className="flex items-end justify-between px-1 mb-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] font-black text-blue-600">
                Explore
              </p>

              <h2 className="text-[19px] font-black text-slate-900">
                Our Services
              </h2>
            </div>

            <Link
              to="/app/services"
              className="text-[11px] font-black text-blue-600"
            >
              View all →
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-3">

            {SERVICES.map((service) => (
              <Link
                key={service.link}
                to={service.link}
                className="
                  bg-white
                  rounded-[20px]
                  p-3
                  min-h-[125px]
                  flex
                  flex-col
                  items-center
                  justify-center
                  text-center
                  shadow-[0_3px_12px_rgba(0,0,0,0.04)]
                  border border-white
                  active:scale-95
                  transition-transform
                "
              >
                <div
                  className={`
                    w-12
                    h-12
                    rounded-[15px]
                    ${service.color}
                    flex
                    items-center
                    justify-center
                    text-xl
                    shadow-sm
                  `}
                >
                  {service.icon}
                </div>

                <p className="text-[11px] font-black text-slate-800 mt-2 leading-tight">
                  {service.title}
                </p>
              </Link>
            ))}

          </div>

        </section>

        {/* QUICK ACTIONS */}

        <section className="mt-8">

          <div className="px-1 mb-3">
            <p className="text-[10px] uppercase tracking-[0.18em] font-black text-blue-600">
              Quick access
            </p>

            <h2 className="text-[19px] font-black text-slate-900">
              Manage your account
            </h2>
          </div>

          <div className="space-y-3">

            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.link}
                to={action.link}
                className="
                  bg-white
                  rounded-[20px]
                  p-4
                  flex
                  items-center
                  gap-4
                  shadow-[0_3px_12px_rgba(0,0,0,0.04)]
                  border border-white
                  active:scale-[0.99]
                  transition-transform
                "
              >

                <div className="
                  w-12
                  h-12
                  rounded-2xl
                  bg-[#EAF4FF]
                  flex
                  items-center
                  justify-center
                  text-xl
                ">
                  {action.icon}
                </div>

                <div className="flex-1">

                  <p className="text-[13px] font-black text-slate-900">
                    {action.title}
                  </p>

                  <p className="text-[10px] text-slate-500 mt-1">
                    {action.description}
                  </p>

                </div>

                <span className="text-slate-300 text-xl">
                  →
                </span>

              </Link>
            ))}

          </div>

        </section>

        {/* BRAND MESSAGE */}

        <section className="
          mt-8
          rounded-[24px]
          bg-blue-600
          p-5
          text-white
          shadow-[0_10px_35px_rgba(37,99,235,0.22)]
        ">

          <p className="text-[10px] uppercase tracking-[0.2em] font-black text-blue-100">
            LEMAK CONNECT
          </p>

          <h2 className="text-[22px] font-black mt-2">
            Everything you need,
            <br />
            in one place.
          </h2>

          <p className="text-[11px] text-blue-100 mt-2 leading-relaxed">
            Access digital services, payments,
            virtual numbers, marketplace services
            and more from one account.
          </p>

          <Link
            to="/app/services"
            className="
              inline-flex
              mt-4
              bg-white
              text-blue-600
              px-5
              py-3
              rounded-full
              text-[11px]
              font-black
            "
          >
            Explore services →
          </Link>

        </section>

      </main>
    </div>
  );
  }

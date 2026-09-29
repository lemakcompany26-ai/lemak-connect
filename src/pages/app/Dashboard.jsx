import AdSlider from "../components/AdSlider"
import React from "react";
import { Link } from "react-router-dom";

const SERVICES = [
  { icon: "📱", title: "Airtime", color: "bg-blue-100", link: "/app/airtime" },
  { icon: "🌐", title: "Data", color: "bg-purple-100", link: "/app/data" },
  { icon: "⚡", title: "Electricity", color: "bg-yellow-100", link: "/app/electricity" },
  { icon: "📺", title: "Cable TV", color: "bg-pink-100", link: "/app/cable" },
  { icon: "🎮", title: "Betting", color: "bg-green-100", link: "/app/betting" },
  { icon: "🎓", title: "Education", color: "bg-amber-100", link: "/app/education" },
  { icon: "📲", title: "Virtual Numbers", color: "bg-indigo-100", link: "/app/virtual-numbers" },
  { icon: "📈", title: "Social Growth", color: "bg-red-100", link: "/app/social-growth" },
  { icon: "🛒", title: "Marketplace", color: "bg-teal-100", link: "/app/marketplace" },
];

const QUICK_ACTIONS = [
  { icon: "💳", title: "My Wallet", description: "Fund your wallet and view your balance", link: "/app/wallet" },
  { icon: "🧾", title: "Transactions", description: "View all your purchases and receipts", link: "/app/transactions" },
  { icon: "🎁", title: "Referrals", description: "Earn rewards by inviting friends", link: "/app/referrals" },
  { icon: "💬", title: "Support", description: "Get help from the LEMAK team", link: "/app/support" },
];

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

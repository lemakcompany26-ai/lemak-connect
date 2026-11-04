
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  X,
  Wifi,
  Smartphone,
  Zap,
  Tv,
  Phone,
  ShieldCheck,
  Clock,
  ArrowRight,
  CheckCircle2,
  MessageCircle,
  Download,
  Sparkles,
  Globe,
  CreditCard,
  Headphones,
  ChevronRight,
  Signal,
  Star,
} from "lucide-react";

const PLAY_STORE_LINK =
  "https://play.google.com/store/apps/details?id=com.lemakconnect.app";

const WHATSAPP_LINK =
  "https://wa.me/2349022143559?text=Hello%20Lemak%20Connect";

const services = [
  {
    icon: Wifi,
    title: "Affordable Data",
    description: "Get data bundles for all major Nigerian networks.",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    tag: "Popular",
  },
  {
    icon: Smartphone,
    title: "Airtime VTU",
    description: "Recharge your phone instantly, anytime.",
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
  },
  {
    icon: Zap,
    title: "Electricity Bills",
    description: "Pay your electricity bills conveniently.",
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
  },
  {
    icon: Tv,
    title: "Cable TV",
    description: "Renew your DStv and GOtv subscriptions.",
    color: "text-pink-400",
    bg: "bg-pink-500/10",
  },
  {
    icon: Phone,
    title: "Virtual Numbers",
    description: "Access virtual number services for supported platforms.",
    color: "text-green-400",
    bg: "bg-green-500/10",
  },
  {
    icon: CreditCard,
    title: "Easy Payments",
    description: "Enjoy a convenient digital payment experience.",
    color: "text-orange-400",
    bg: "bg-orange-500/10",
  },
];

const networks = [
  { name: "MTN", color: "bg-yellow-400 text-black" },
  { name: "AIRTEL", color: "bg-red-600 text-white" },
  { name: "GLO", color: "bg-green-600 text-white" },
  { name: "9MOBILE", color: "bg-emerald-500 text-white" },
];

const features = [
  {
    icon: ShieldCheck,
    title: "Secure Experience",
    description:
      "A straightforward platform designed with customer security in mind.",
  },
  {
    icon: Clock,
    title: "Convenient Access",
    description:
      "Access your digital services whenever you need them.",
  },
  {
    icon: Headphones,
    title: "Customer Support",
    description:
      "Reach our support team whenever you need assistance.",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: "easeOut" },
  },
};

export default function Landing() {
  const [showAndroidPopup, setShowAndroidPopup] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);

  useEffect(() => {
    document.title =
      "Lemak Connect | Buy Data, Airtime & Pay Bills in Nigeria";

    let meta = document.querySelector(
      'meta[name="description"]'
    );

    const originalDescription = meta?.content;

    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }

    meta.content =
      "Buy affordable MTN, Airtel, Glo and 9mobile data, airtime VTU, pay electricity bills, DStv and GOtv subscriptions with Lemak Connect.";

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.dataset.lemakSeo = "true";
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Lemak Connect",
      url: "https://www.lemakconnect.com",
      logo: "https://www.lemakconnect.com/logo.png",
    });

    document.head.appendChild(script);

    let popupTimer;

    try {
      const isAndroid = /Android/i.test(navigator.userAgent);
      const hasSeenPopup = localStorage.getItem("seenAndroidPopup");

      if (isAndroid && !hasSeenPopup) {
        popupTimer = setTimeout(() => {
          setShowAndroidPopup(true);
        }, 2500);
      }
    } catch {
      // Continue normally if browser storage is unavailable.
    }

    return () => {
      clearTimeout(popupTimer);
      script.remove();

      if (meta && originalDescription !== undefined) {
        meta.content = originalDescription;
      }
    };
  }, []);

  const closePopup = () => {
    try {
      localStorage.setItem("seenAndroidPopup", "1");
    } catch {
      // Ignore unavailable storage.
    }
    setShowAndroidPopup(false);
  };

  const closeMenu = () => setMobileMenu(false);

  return (
    <div className="min-h-screen bg-[#080B18] text-white font-sans overflow-hidden selection:bg-purple-500 selection:text-white">

      {/* BACKGROUND EFFECTS */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-48 -left-40 w-96 h-96 bg-purple-700/20 blur-[120px] rounded-full" />
        <div className="absolute top-[40%] -right-40 w-96 h-96 bg-indigo-600/10 blur-[120px] rounded-full" />
      </div>

      {/* ANDROID APP POPUP */}
      <AnimatePresence>
        {showAndroidPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.8, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 30 }}
              className="w-full max-w-sm bg-[#13182B] border border-purple-500/30 rounded-[28px] p-7 text-center shadow-2xl"
            >
              <div className="w-16 h-16 mx-auto rounded-2xl bg-purple-600/20 flex items-center justify-center mb-5">
                <Smartphone size={34} className="text-purple-400" />
              </div>

              <h3 className="text-2xl font-black">
                Get the Lemak App!
              </h3>

              <p className="text-gray-400 text-sm mt-3 leading-6">
                Enjoy convenient access to your digital services
                from your Android device.
              </p>

              <a
                href={PLAY_STORE_LINK}
                target="_blank"
                rel="noopener noreferrer"
                onClick={closePopup}
                className="mt-6 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 rounded-xl py-4 font-bold transition"
              >
                <Download size={19} />
                Download App
              </a>

              <button
                onClick={closePopup}
                className="mt-4 text-gray-400 hover:text-white text-sm"
              >
                Continue on website
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* NAVIGATION */}
      <header className="relative z-50 sticky top-0 bg-[#080B18]/90 backdrop-blur-xl border-b border-white/[0.07]">
        <nav className="max-w-7xl mx-auto px-5 md:px-10 h-[76px] flex items-center justify-between">

          <a href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-700 flex items-center justify-center shadow-lg shadow-purple-600/20">
              <Zap size={23} className="text-white fill-white" />
            </div>

            <div>
              <div className="font-black tracking-wide text-lg">
                LEMAK<span className="text-purple-400"> CONNECT</span>
              </div>
              <div className="text-[9px] tracking-[3px] text-gray-500 font-bold">
                CONNECT. PAY. ENJOY.
              </div>
            </div>
          </a>

          <div className="hidden lg:flex items-center gap-8 text-sm font-semibold text-gray-400">
            <a href="#home" className="hover:text-purple-400 transition">Home</a>
            <a href="#services" className="hover:text-purple-400 transition">Services</a>
            <a href="#networks" className="hover:text-purple-400 transition">Networks</a>
            <a href="#about" className="hover:text-purple-400 transition">About Us</a>
            <a href="#contact" className="hover:text-purple-400 transition">Contact</a>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <a
              href="/login"
              className="px-5 py-3 text-sm font-bold text-gray-300 hover:text-white transition"
            >
              Login
            </a>

            <a
              href="/login"
              className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold shadow-lg shadow-purple-600/20 transition flex items-center gap-2"
            >
              Get Started <ArrowRight size={16} />
            </a>
          </div>

          <button
            onClick={() => setMobileMenu(!mobileMenu)}
            className="md:hidden w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center"
            aria-label="Toggle navigation"
            aria-expanded={mobileMenu}
          >
            {mobileMenu ? <X /> : <Menu />}
          </button>
        </nav>

        {/* MOBILE MENU */}
        <AnimatePresence>
          {mobileMenu && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden overflow-hidden bg-[#10152A] border-t border-white/10"
            >
              <div className="p-5 flex flex-col gap-5 text-sm font-semibold">
                {[
                  ["Home", "#home"],
                  ["Services", "#services"],
                  ["Networks", "#networks"],
                  ["About Us", "#about"],
                  ["Contact", "#contact"],
                ].map(([name, link]) => (
                  <a
                    key={name}
                    href={link}
                    onClick={closeMenu}
                    className="text-gray-300 hover:text-purple-400"
                  >
                    {name}
                  </a>
                ))}

                <a
                  href="/login"
                  className="text-center bg-purple-600 rounded-xl p-4 font-bold text-white"
                >
                  Login / Get Started
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="relative z-10">

        {/* HERO SECTION */}
        <section
          id="home"
          className="max-w-7xl mx-auto px-5 md:px-10 pt-20 pb-20 md:pt-28 md:pb-32"
        >
          <div className="grid lg:grid-cols-2 gap-14 items-center">

            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeUp}
            >
              <div className="inline-flex items-center gap-2 border border-purple-500/30 bg-purple-500/10 rounded-full px-4 py-2 text-xs font-bold text-purple-300">
                <Sparkles size={14} />
                YOUR DIGITAL WORLD, SIMPLIFIED
              </div>

              <h1 className="text-5xl sm:text-6xl lg:text-[68px] font-black leading-[1.08] mt-8 tracking-tight">
                Everything You Need.
                <span className="block mt-2 bg-gradient-to-r from-purple-400 via-fuchsia-400 to-indigo-400 bg-clip-text text-transparent">
                  One Connection.
                </span>
              </h1>

              <p className="text-gray-400 text-base md:text-lg leading-8 mt-7 max-w-xl">
                Buy affordable data, recharge airtime, pay electricity
                bills and manage your digital services with Lemak Connect.
                Simple, convenient and accessible.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mt-9">
                <a
                  href="/login"
                  className="group flex items-center justify-center gap-3 bg-purple-600 hover:bg-purple-500 px-8 py-4 rounded-xl font-bold shadow-xl shadow-purple-600/20 transition hover:-translate-y-1"
                >
                  Start Buying Now
                  <ArrowRight size={19} className="group-hover:translate-x-1 transition" />
                </a>

                <a
                  href="#services"
                  className="flex items-center justify-center gap-2 border border-white/15 hover:border-purple-400/50 bg-white/[0.03] px-8 py-4 rounded-xl font-bold transition"
                >
                  Explore Services
                  <ChevronRight size={18} />
                </a>
              </div>

              <div className="flex flex-wrap gap-5 mt-9 text-sm text-gray-400">
                <span className="flex items-center gap-2">
                  <CheckCircle2 size={17} className="text-purple-400" />
                  Easy to use
                </span>
                <span className="flex items-center gap-2">
                  <CheckCircle2 size={17} className="text-purple-400" />
                  Convenient payments
                </span>
              </div>
            </motion.div>

            {/* HERO DASHBOARD VISUAL */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.9 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-purple-600/20 blur-[100px] rounded-full" />

              <div className="relative rounded-[30px] border border-purple-500/20 bg-[#11172B] p-6 md:p-8 shadow-2xl shadow-purple-900/20">

                <div className="flex items-center justify-between mb-8">
                  <div>
                    <p className="text-gray-400 text-xs">WELCOME TO</p>
                    <h3 className="text-xl font-black mt-1">
                      Lemak Connect
                    </h3>
                  </div>

                  <div className="w-11 h-11 rounded-xl bg-purple-600/20 flex items-center justify-center">
                    <Zap className="text-purple-400" />
                  </div>
                </div>

                <div className="rounded-2xl p-6 bg-gradient-to-br from-purple-700 via-purple-600 to-indigo-700">
                  <div className="flex justify-between items-center">
                    <span className="text-purple-100 text-sm font-semibold">
                      DIGITAL SERVICES
                    </span>
                    <Signal size={19} />
                  </div>

                  <h3 className="text-3xl md:text-4xl font-black mt-7">
                    All in One.
                  </h3>

                  <p className="text-purple-100 text-sm mt-2">
                    Everything connected to you.
                  </p>

                  <div className="flex items-center justify-between mt-7">
                    <span className="text-sm font-semibold">
                      Explore your services
                    </span>
                    <ArrowRight size={20} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-5">
                  {services.slice(0, 4).map((service, index) => {
                    const Icon = service.icon;

                    return (
                      <motion.div
                        key={service.title}
                        whileHover={{ y: -5 }}
                        transition={{ duration: 0.2 }}
                        className="rounded-xl border border-white/[0.07] bg-white/[0.035] p-4"
                      >
                        <div className={`w-10 h-10 rounded-xl ${service.bg} flex items-center justify-center mb-3`}>
                          <Icon size={21} className={service.color} />
                        </div>
                        <p className="text-sm font-bold">
                          {service.title}
                        </p>
                        <p className="text-[11px] text-gray-500 mt-1">
                          Explore service
                        </p>
                      </motion.div>
                    );
                  })}
                </div>

                <div className="flex justify-center items-center gap-2 mt-6 text-xs text-gray-500">
                  <ShieldCheck size={15} className="text-purple-400" />
                  Your digital services, connected.
                </div>
              </div>

              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ repeat: Infinity, duration: 4 }}
                className="hidden md:flex absolute -left-10 top-24 bg-[#1B2340] border border-purple-500/20 rounded-xl p-4 shadow-xl items-center gap-3"
              >
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <CheckCircle2 className="text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Service access</p>
                  <p className="font-bold text-sm">Easy & Convenient</p>
                </div>
              </motion.div>
            </motion.div>

          </div>
        </section>

        {/* NETWORK SECTION */}
        <section
          id="networks"
          className="border-y border-white/[0.07] bg-white/[0.02] py-12"
        >
          <div className="max-w-7xl mx-auto px-5 md:px-10 text-center">
            <p className="text-gray-400 text-sm font-semibold tracking-widest">
              CONNECT TO NIGERIA'S MAJOR NETWORKS
            </p>

            <div className="flex flex-wrap justify-center gap-4 md:gap-8 mt-8">
              {networks.map((network) => (
                <div
                  key={network.name}
                  className={`${network.color} rounded-xl px-7 py-4 font-black tracking-wide shadow-lg`}
                >
                  {network.name}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SERVICES SECTION */}
        <section
          id="services"
          className="max-w-7xl mx-auto px-5 md:px-10 py-24"
        >
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="text-center max-w-2xl mx-auto"
          >
            <span className="text-purple-400 text-xs font-black tracking-[3px]">
              WHAT WE OFFER
            </span>

            <h2 className="text-3xl md:text-5xl font-black mt-5">
              Everything in
              <span className="text-purple-400"> One Place.</span>
            </h2>

            <p className="text-gray-400 mt-5 leading-7">
              Discover convenient digital services designed to
              make your everyday transactions easier.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-14">
            {services.map((service, index) => {
              const Icon = service.icon;

              return (
                <motion.a
                  href="/login"
                  key={service.title}
                  initial={{ opacity: 0, y: 25 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.08 }}
                  whileHover={{ y: -7 }}
                  className="group border border-white/[0.08] bg-[#11172A] hover:bg-[#171D36] hover:border-purple-500/40 rounded-2xl p-7 transition duration-300"
                >
                  <div className={`w-14 h-14 ${service.bg} rounded-2xl flex items-center justify-center`}>
                    <Icon size={27} className={service.color} />
                  </div>

                  <h3 className="font-black text-xl mt-6">
                    {service.title}
                  </h3>

                  <p className="text-gray-400 text-sm leading-7 mt-3">
                    {service.description}
                  </p>

                  <div className="flex items-center gap-2 text-purple-400 font-bold text-sm mt-7">
                    Get Started
                    <ArrowRight size={16} className="group-hover:translate-x-2 transition" />
                  </div>
                </motion.a>
              );
            })}
          </div>
        </section>

        {/* ABOUT / FEATURES */}
        <section
          id="about"
          className="relative bg-[#10162A] border-y border-white/[0.06] py-24"
        >
          <div className="absolute right-0 top-0 w-80 h-80 bg-purple-600/10 blur-[100px]" />

          <div className="relative max-w-7xl mx-auto px-5 md:px-10">
            <div className="grid lg:grid-cols-2 gap-16 items-center">

              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
              >
                <span className="text-purple-400 font-black text-xs tracking-[3px]">
                  WHY LEMAK CONNECT
                </span>

                <h2 className="text-4xl md:text-5xl font-black leading-tight mt-6">
                  More than a platform.
                  <span className="block text-purple-400">
                    A better connection.
                  </span>
                </h2>

                <p className="text-gray-400 leading-8 mt-6">
                  We make everyday digital services easier to access.
                  From mobile top-ups to bill payments, Lemak Connect
                  brings useful services together in one convenient place.
                </p>

                <a
                  href="/login"
                  className="inline-flex items-center gap-3 mt-8 bg-purple-600 hover:bg-purple-500 px-7 py-4 rounded-xl font-bold transition"
                >
                  Join Lemak Connect
                  <ArrowRight size={18} />
                </a>
              </motion.div>

              <div className="space-y-5">
                {features.map((feature, index) => {
                  const Icon = feature.icon;

                  return (
                    <motion.div
                      key={feature.title}
                      initial={{ opacity: 0, x: 30 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.15 }}
                      className="flex gap-5 p-6 rounded-2xl border border-white/[0.08] bg-white/[0.025]"
                    >
                      <div className="shrink-0 w-12 h-12 rounded-xl bg-purple-600/15 flex items-center justify-center">
                        <Icon className="text-purple-400" size={24} />
                      </div>

                      <div>
                        <h3 className="font-black text-lg">
                          {feature.title}
                        </h3>
                        <p className="text-sm text-gray-400 mt-2 leading-6">
                          {feature.description}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

            </div>
          </div>
        </section>

        {/* DOWNLOAD APP */}
        <section className="max-w-7xl mx-auto px-5 md:px-10 py-24">
          <div className="relative overflow-hidden rounded-[30px] border border-purple-500/20 bg-gradient-to-br from-[#24114D] via-[#171A40] to-[#10162A] p-8 md:p-14">
            <div className="absolute -right-20 -top-20 w-80 h-80 bg-purple-500/20 blur-[100px] rounded-full" />

            <div className="relative grid md:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-2 text-xs font-bold text-purple-200">
                  <Smartphone size={15} />
                  MOBILE EXPERIENCE
                </div>

                <h2 className="text-3xl md:text-5xl font-black mt-7 leading-tight">
                  Your services.
                  <span className="block text-purple-300">
                    In your pocket.
                  </span>
                </h2>

                <p className="text-gray-300 leading-7 mt-5">
                  Access Lemak Connect on the go. Get our Android
                  application through Google Play when available.
                </p>

                <a
                  href={PLAY_STORE_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 bg-white text-black hover:bg-gray-200 rounded-xl px-6 py-4 mt-8 font-bold transition"
                >
                  <Download size={20} />
                  Get Android App
                </a>
              </div>

              <div className="hidden md:flex justify-center">
                <motion.div
                  animate={{ y: [0, -12, 0], rotate: [0, 2, 0] }}
                  transition={{ repeat: Infinity, duration: 5 }}
                  className="w-48 h-80 rounded-[35px] border-[5px] border-gray-600 bg-[#080B18] p-4 shadow-2xl shadow-purple-950/50"
                >
                  <div className="w-16 h-4 rounded-full bg-black mx-auto" />

                  <div className="mt-10 text-center">
                    <div className="w-14 h-14 bg-purple-600 rounded-2xl mx-auto flex items-center justify-center">
                      <Zap size={30} />
                    </div>
                    <h3 className="font-black mt-4">LEMAK</h3>
                    <p className="text-purple-400 text-xs">
                      CONNECT
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-10">
                    {[Wifi, Phone, Zap, Tv].map((Icon, i) => (
                      <div
                        key={i}
                        className="h-12 bg-purple-500/10 rounded-xl flex items-center justify-center"
                      >
                        <Icon className="text-purple-400" />
                      </div>
                    ))}
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </section>

        {/* CONTACT CTA */}
        <section
          id="contact"
          className="text-center px-5 py-20 border-t border-white/[0.07]"
        >
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="max-w-3xl mx-auto"
          >
            <div className="w-16 h-16 bg-purple-600/15 rounded-2xl flex items-center justify-center mx-auto">
              <Globe size={30} className="text-purple-400" />
            </div>

            <h2 className="text-3xl md:text-5xl font-black mt-7">
              Ready to get connected?
            </h2>

            <p className="text-gray-400 mt-5 leading-7">
              Start using Lemak Connect today and enjoy convenient
              access to your everyday digital services.
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-4 mt-9">
              <a
                href="/login"
                className="bg-purple-600 hover:bg-purple-500 rounded-xl px-8 py-4 font-bold transition flex justify-center items-center gap-2"
              >
                Create Your Account
                <ArrowRight size={18} />
              </a>

              <a
                href={WHATSAPP_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="border border-white/15 hover:border-green-500 rounded-xl px-8 py-4 font-bold transition flex justify-center items-center gap-2"
              >
                <MessageCircle size={19} className="text-green-400" />
                Contact Us
              </a>
            </div>
          </motion.div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-white/[0.08] bg-[#060914]">
        <div className="max-w-7xl mx-auto px-5 md:px-10 py-14">

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-10">

            <div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center">
                  <Zap size={22} />
                </div>
                <span className="font-black text-lg">
                  LEMAK <span className="text-purple-400">CONNECT</span>
                </span>
              </div>

              <p className="text-gray-500 text-sm leading-7 mt-5 max-w-sm">
                Your digital services platform for convenient
                airtime, data and bill payments.
              </p>
            </div>

            <div>
              <h4 className="font-black mb-5">Quick Links</h4>
              <div className="flex flex-col gap-4 text-sm text-gray-400">
                <a href="#home" className="hover:text-purple-400">Home</a>
                <a href="#services" className="hover:text-purple-400">Our Services</a>
                <a href="#about" className="hover:text-purple-400">About Us</a>
                <a href="/login" className="hover:text-purple-400">Login</a>
              </div>
            </div>

            <div>
              <h4 className="font-black mb-5">Get in Touch</h4>
              <div className="flex flex-col gap-4 text-sm text-gray-400">
                <a href="tel:09022143559" className="hover:text-purple-400">
                  09022143559
                </a>
                <a
                  href={WHATSAPP_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-purple-400"
                >
                  WhatsApp Support
                </a>
                <a href="https://www.lemakconnect.com" className="hover:text-purple-400">
                  www.lemakconnect.com
                </a>
              </div>
            </div>

          </div>

          <div className="border-t border-white/[0.07] mt-12 pt-7 flex flex-col md:flex-row justify-between gap-4 text-xs text-gray-500">
            <p>
              © {new Date().getFullYear()} Lemak Connect. All rights reserved.
            </p>
            <p>Connecting your digital world.</p>
          </div>

        </div>
      </footer>

      {/* FLOATING WHATSAPP BUTTON */}
      <motion.a
        href={WHATSAPP_LINK}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with Lemak Connect on WhatsApp"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-5 right-5 md:bottom-7 md:right-7 z-[60] flex items-center gap-2 bg-green-500 hover:bg-green-400 text-white rounded-full px-5 py-4 shadow-2xl shadow-green-900/30 font-bold text-sm"
      >
        <MessageCircle size={21} />
        <span className="hidden sm:inline">WhatsApp Us</span>
      </motion.a>

    </div>
  );
}

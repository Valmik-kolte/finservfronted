
import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { FaCheck, FaUniversity, FaBolt, FaFileAlt, FaShieldAlt, FaArrowRight, FaAndroid, FaApple,FaDownload } from "react-icons/fa";
import { MdDirectionsCar, MdVerified, MdTimer } from "react-icons/md";
import Header from "./Header";
import Footer from "./Footer";
import heroVideo from "../../assets/hero-car-video.mp4";
import hdfc from "../../assets/HDFC_Bank_Logo.png";
import sbi from "../../assets/SBI.png";
import icici from "../../assets/ICICI_Bank_Logo.png";
import axis from "../../assets/Axis_Bank_logo.png";
import pnb from "../../assets/Punjab_National_Bank_new_logo.png";

const Landing = () => {
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) return;

    const targetId = location.hash.replace("#", "");
    const element = document.getElementById(targetId);

    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    } else if (targetId === "top") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [location]);

  return (
    <div id="top" className="min-h-screen bg-gradient-to-b from-[#f8fafc] to-white">
      <Header />

      {/* Hero Section */}

      <section className="relative overflow-hidden bg-gradient-to-br from-[#112B5A]/5 to-[#1ECFC3]/5">
  <video
    className="absolute inset-0 h-full w-full object-cover"
    autoPlay
    muted
    loop
    playsInline
    preload="auto"
  >
    <source src={heroVideo} type="video/mp4" />
  </video>

        {/* Enhanced dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-black/20 to-transparent" />

        {/* Improved gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/20 to-transparent" />

        <div className="relative z-10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
            <div className="grid min-h-screen lg:min-h-[700px] items-center lg:grid-cols-2 gap-6 md:gap-10 lg:gap-16 py-12 sm:py-20 lg:py-0">
              {/* LEFT CONTENT */}
              <div className="flex flex-col justify-center space-y-6 lg:space-y-8 order-2 lg:order-1">
                {/* Badge */}
              
                {/* <div className="inline-flex items-center gap-2 rounded-full bg-[#1ECFC3]/20 px-4 py-2 w-fit border border-[#1ECFC3]/30 backdrop-blur-sm">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1ECFC3]/30">
                    <MdDirectionsCar className="text-[#1ECFC3] text-sm" />
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-[#1ECFC3]">Fast Vehicle Loans</span>
                </div> */}

               {/* Main Heading */}
<div className="space-y-4">
  <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black leading-tight text-[#112B5A] tracking-tight">
    Get Your
    <br className="hidden sm:block" />
    Dream
    <br />
    <span className="bg-gradient-to-r from-[#1ECFC3] to-[#00B4D8] bg-clip-text text-transparent drop-shadow-lg">
      Vehicle Loan
    </span>
  </h1>

 
</div>

                {/* Description */}
                <p className="text-base sm:text-lg text-black font-bold leading-relaxed max-w-xl">
  तुमच्या Dream Car चं स्वप्न आता एका Click वर!
  Best Interest Rates, Quick Approval आणि Trusted Bank Partners सोबत
  Drive Your Success Today.
</p>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2">
                  <Link
                    to="/register"
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#1ECFC3] to-[#00B4D8] px-8 py-3 font-bold text-white shadow-lg shadow-[#1ECFC3]/20 transition duration-300 hover:opacity-95 active:scale-95 text-sm sm:text-base"
                  >
                    Apply Now <FaArrowRight size={16} />
                  </Link>

                  <a href="https://play.google.com/store/apps/details?id=com.vahanfinserv" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center rounded-full border border-[#1ECFC3]/30 bg-[#082544] px-8 py-3 font-bold text-white backdrop-blur-sm transition duration-300 hover:border-[#1ECFC3] hover:bg-[#082544]/3 active:scale-95 text-sm sm:text-base">
                    Download APK <FaDownload size={16} className="ml-2" />
                  </a>
                </div>

                {/* Trust Badges */}
                <div className="flex flex-wrap gap-3 sm:gap-4 pt-4 text-xs sm:text-sm">
                  <div className="flex items-center gap-2 text-gray-700">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1ECFC3]/20">
                      <MdVerified className="text-[#1ECFC3] text-base" />
                    </div>
                    <span className="font-medium">Trusted by 10,000+</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1ECFC3]/20">
                      <MdTimer className="text-[#1ECFC3] text-base" />
                    </div>
                    <span className="font-medium">Approved in 24h</span>
                  </div>
                </div>
              </div>

              
            </div>
          </div>
        </div>
      </section>

      {/* Partners Section */}
      <section id="our-banks" className="px-4 sm:px-6 py-14 sm:py-20 lg:px-10 bg-[#1ECFC3]/5">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-12 fade-up">
            <span className="text-sm font-semibold uppercase tracking-[0.35em] text-[#1ECFC3]">Our Banking Partners</span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-bold text-[#112B5A]">
              Trusted by the best banks in India
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-gray-600">
              We work with leading financial institutions to bring you the smartest loan offers, seamless approvals, and competitive interest rates.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { src: hdfc, alt: "HDFC Bank" },
              { src: sbi, alt: "SBI" },
              { src: icici, alt: "ICICI Bank" },
              { src: axis, alt: "Axis Bank" },
              { src: pnb, alt: "PNB" },
            ].map((bank, idx) => (
              <div key={bank.alt} className="group rounded-3xl border border-slate-200 bg-white/90 shadow-sm transition duration-500 hover:-translate-y-2 hover:shadow-2xl hover:border-[#1ECFC3]/30 fade-up" style={{ animationDelay: `${idx * 100}ms` }}>
                <div className="flex h-28 items-center justify-center overflow-hidden rounded-3xl bg-slate-50 p-4">
                  <img src={bank.src} alt={bank.alt} className="max-h-16 object-contain transition duration-500 group-hover:scale-110" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section id="how-it-works" className="bg-gradient-to-r from-[#112B5A] to-[#1a3f7a] px-4 sm:px-6 py-14 sm:py-16 lg:px-10 ">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="text-center">
              <p className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-[#1ECFC3] to-[#00D4AF] bg-clip-text text-transparent">100+</p>
              <p className="mt-2 text-sm font-medium text-gray-200">Loan Applications</p>
            </div>
            <div className="text-center">
              <p className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-[#1ECFC3] to-[#00D4AF] bg-clip-text text-transparent">10+</p>
              <p className="mt-2 text-sm font-medium text-gray-200">Banking Partners</p>
            </div>
            <div className="text-center">
              <p className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-[#1ECFC3] to-[#00D4AF] bg-clip-text text-transparent">95%</p>
              <p className="mt-2 text-sm font-medium text-gray-200">Approval Success</p>
            </div>
            <div className="text-center">
              <p className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-[#1ECFC3] to-[#00D4AF] bg-clip-text text-transparent">150+</p>
              <p className="mt-2 text-sm font-medium text-gray-200">Happy Customers</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="px-4 sm:px-6 py-14 sm:py-20 lg:px-10 bg-[#1ECFC3]/5">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#112B5A] mb-4">
              How It Works
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Get your dream vehicle loan in just 4 simple steps with our streamlined process
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-4 md:grid-cols-2">
            {[
              { step: "1", title: "Complete Application", desc: "Fill out a simple form with your basic details in 5 minutes", icon: "📝" },
              { step: "2", title: "Upload Documents", desc: "Upload your documents through our secure portal", icon: "📄" },
              { step: "3", title: "Bank Verification", desc: "Banks review and verify your details instantly", icon: "✓" },
              { step: "4", title: "Get Approved", desc: "Receive loan approval and start your vehicle journey", icon: "🎉" },
            ].map((item, idx) => (
              <div key={idx} className="relative">
                <div className="rounded-2xl bg-[#1ECFC3]/20 p-5 sm:p-8 border border-[#1ECFC3]/20 h-full">
                  <div className="text-5xl mb-4">{item.icon}</div>
                  <div className="absolute -top-6 -left-6 w-12 h-12 rounded-full bg-gradient-to-br from-[#1ECFC3] to-[#00D4AF] flex items-center justify-center text-white font-bold text-lg">
                    {item.step}
                  </div>
                  <h3 className="text-lg font-bold text-[#112B5A] mb-3">{item.title}</h3>
                  <p className="text-gray-600 text-sm">{item.desc}</p>
                </div>
               
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Us & Features Section */}
      <section id="about-us" className="px-4 sm:px-6 py-14 sm:py-20 lg:px-10 bg-gradient-to-r from-[#112B5A] to-[#1a3f7a]">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
              Why Choose Us?
            </h2>
            <p className="text-lg text-gray-200">Experience the easiest way to get a vehicle loan</p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: <FaUniversity className="text-2xl text-[#1ECFC3]" />, title: "10+ Banks", desc: "Compare offers from India's leading financial institutions" },
              { icon: <FaBolt className="text-2xl text-[#1ECFC3]" />, title: "24-Hour Approval", desc: "Get instant loan approval without unnecessary delays" },
              { icon: <FaFileAlt className="text-2xl text-[#1ECFC3]" />, title: "Minimal Docs", desc: "Paperless process with easy online document upload" },
              { icon: <FaShieldAlt className="text-2xl text-[#1ECFC3]" />, title: "100% Secure", desc: "Bank-level security for all your personal information" },
            ].map((item, idx) => (
              <div key={idx} className="group rounded-2xl bg-white/10 backdrop-blur-sm p-5 sm:p-8 border border-[#1ECFC3]/20 hover:border-[#1ECFC3]/50 hover:shadow-xl transition-all duration-300">
                <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-[#1ECFC3]/20 group-hover:bg-[#1ECFC3]/30 transition-all">
                  {item.icon}
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                <p className="text-gray-300 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

     {/* Mobile App Section */}
<section className="bg-[#1ECFC3]/5 px-4 sm:px-6 py-14 sm:py-20 lg:px-10">
  <div className="mx-auto max-w-7xl">

    {/* UPDATED GRID (left small, right large) */}
    <div className="grid gap-12 lg:grid-cols-[1fr_1.8fr] lg:items-center">

      {/* LEFT SIDE - SMALL MOBILE MOCKUP */}
      <div className="flex justify-center lg:justify-start">
        <div className="relative w-52 h-80 lg:w-60 lg:h-96 bg-gradient-to-b from-gray-900 to-black rounded-[3rem] border-8 border-gray-800 shadow-2xl overflow-hidden">

          <div className="absolute inset-0 bg-gradient-to-b from-[#1ECFC3]/20 to-transparent" />

          <div className="relative z-10 h-full flex items-center justify-center">
            <div className="text-center text-white">
              <div className="text-5xl mb-3">📱</div>
              <p className="text-sm font-medium">Mobile App</p>
              <p className="text-xs text-gray-400 mt-2">Coming Soon</p>
            </div>
          </div>

        </div>
      </div>

      {/* RIGHT SIDE - LARGE CONTENT */}
      <div className="space-y-6 text-[#112B5A]">

        <h2 className="text-3xl sm:text-4xl font-bold leading-tight lg:text-5xl">
          Manage Your Loan <br />
          <span className="bg-gradient-to-r from-[#1ECFC3] to-[#00D4AF] bg-clip-text text-transparent">
            Anytime, Anywhere
          </span>
        </h2>

        <p className="text-gray-700 text-lg leading-relaxed max-w-2xl">
          Download our mobile app and stay updated on your loan application status,
          compare bank offers, and manage all your documents from your smartphone.
        </p>

        {/* FEATURES */}
        <div className="space-y-4 pt-4">
          {[
            "Real-time application tracking",
            "Compare multiple bank offers",
            "Instant document upload",
            "Push notifications & alerts"
          ].map((feature, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <div className="rounded-full bg-[#1ECFC3]/20 p-2">
                <FaCheck className="text-[#1ECFC3]" size={16} />
              </div>
              <span className="text-gray-700">{feature}</span>
            </div>
          ))}
        </div>

        {/* BUTTONS */}
        <div className="flex flex-wrap gap-4 pt-6">

          <a
            href="https://play.google.com/store/apps/details?id=com.vahanfinserv"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#082544] text-white font-semibold rounded-full border border-gray-200  transition"
          >
            <FaAndroid size={18} /> Play Store
          </a>

          <a
            href="https://apps.apple.com/app/vahan-finserv"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#1ECFC3] to-[#00B4D8] text-white font-semibold rounded-full hover:bg-[#00B4D8] transition"
          >
            <FaApple size={18} /> App Store
          </a>

        </div>

      </div>
    </div>
  </div>
</section>
      

     

    
      <Footer />
    </div>
  );
};

export default Landing;



  

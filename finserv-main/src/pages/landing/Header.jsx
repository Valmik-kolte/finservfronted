import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FaBars, FaTimes } from "react-icons/fa";
import logo from "../../assets/logo2.png";
const navLinks = [
  { label: "Home", href: "/#top", id: "top" },
  { label: "Our Banks", href: "/#our-banks", id: "our-banks" },
  { label: "How It Works", href: "/#how-it-works", id: "how-it-works" },
  { label: "About Us", href: "/#about-us", id: "about-us" },
  { label: "Contact", href: "/#contact", id: "contact" },
];

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("top");

  useEffect(() => {
    const sections = navLinks.map((item) => item.id);

    const updateActiveSection = () => {
      const scrollPosition = window.scrollY + 120;
      let current = sections[0];

      for (const sectionId of sections) {
        const sectionEl = document.getElementById(sectionId);
        if (!sectionEl) continue;

        const sectionTop = sectionEl.offsetTop;
        if (scrollPosition >= sectionTop) {
          current = sectionId;
        }
      }

      setActiveSection(current);
    };

    updateActiveSection();
    window.addEventListener("scroll", updateActiveSection);
    window.addEventListener("resize", updateActiveSection);

    return () => {
      window.removeEventListener("scroll", updateActiveSection);
      window.removeEventListener("resize", updateActiveSection);
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-700 bg-[#082544] shadow-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
        <div className="flex h-[72px] items-center justify-between gap-4">
          <Link to="/" className="flex min-w-0 items-center gap-2 sm:gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center sm:h-12 sm:w-12">
              <img src={logo} alt="Caryanam FinServ Logo" className="h-full w-full rounded-full object-contain" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold leading-none text-white sm:text-2xl">
                Caryanam <span className="text-[#1ECFC3]">FinServ</span>
              </h1>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-8">
            {navLinks.map((item) => (
              <Link
                key={item.label}
                to={item.href}
                className={`relative text-md font-medium transition-colors ${
                  activeSection === item.id
                    ? "text-[#1ECFC3]"
                    : "text-slate-200 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-3">
            <Link
              to="/login"
              className="rounded-full border border-[#1ECFC3]/30 bg-white/10 px-6 py-2 text-sm font-medium text-slate-100 transition hover:border-[#1ECFC3] hover:bg-[#1ECFC3]/10"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="rounded-full bg-gradient-to-r from-[#1ECFC3] to-[#00B4D8] px-6 py-2 text-sm font-medium text-white shadow-lg shadow-[#1ECFC3]/20 transition hover:opacity-95"
            >
              Apply Now
            </Link>
          </div>

          <button
            className="lg:hidden text-white"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle navigation"
          >
            {isOpen ? <FaTimes size={26} /> : <FaBars size={26} />}
          </button>
        </div>
      </div>

      <div
        className={`overflow-hidden transition-all duration-300 lg:hidden ${
          isOpen ? "max-h-[360px]" : "max-h-0"
        }`}
      >
        <div className="border-t border-slate-700 bg-[#082544] px-4 py-5">
          <nav className="flex flex-col gap-4">
            {navLinks.map((item) => (
              <Link
                key={item.label}
                to={item.href}
                className={`text-sm font-medium transition-colors ${
                  activeSection === item.id
                    ? "text-[#1ECFC3]"
                    : "text-slate-200 hover:text-white"
                }`}
                onClick={() => setIsOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-5 flex flex-col gap-3">
            <Link
              to="/login"
              className="rounded-full border border-slate-600 py-2 text-center text-sm font-medium text-slate-200 transition hover:border-[#1ECFC3]"
            >
              login
            </Link>
            <Link
              to="/register"
              className="rounded-full bg-[#1ECFC3] py-2 text-center text-sm font-medium text-white transition hover:bg-[#00B4D8]"
            >
              Apply Now
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

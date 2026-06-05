



import logo from "../../assets/logo2.png";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
      <footer id="contact" className="bg-[#0a2540] px-6 py-12 text-white lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            {/* Company Info */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-11 w-11 items-center justify-center">
                  <img src={logo} alt="Caryanam FinServ Logo" className="h-full w-full rounded-full object-contain" />
                </div>
<h1 className="text-xl font-bold leading-none text-white">
                Caryanam <span className="text-[#1ECFC3]">FinServ</span>
              </h1>              </div>
              <p className="text-md text-gray-300">
                Your trusted partner for vehicle loans. Fast approvals, zero interest rates and no hidden charges.
              </p>
             
            </div>

            {/* Quick Links */}
            <div>
              <h2 className="font-bold mb-4">Quick Links</h2>
              <ul className="space-y-2 text-sm text-gray-300">
                <li><Link to="/#top" className="hover:text-[#27D3C3]">Home</Link></li>
                <li><Link to="/#our-banks" className="hover:text-[#27D3C3]">Our Banks</Link></li>
                <li><Link to="/#how-it-works" className="hover:text-[#27D3C3]">How It Works</Link></li>
                <li><Link to="/#about-us" className="hover:text-[#27D3C3]">About Us</Link></li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h2 className="font-bold mb-4">Resources</h2>
              <ul className="space-y-2 text-sm text-gray-300">
                <li><Link to="/faq" className="hover:text-[#27D3C3]">FAQs</Link></li>
                <li><Link to="/loan-calculator" className="hover:text-[#27D3C3]">Loan Calculator</Link></li>
            
              </ul>
              
            </div>

            {/* Contact */}
            <div>
              <h2 className="font-bold mb-4">Contact Us</h2>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>✉️ support@canyonamfinserv.com</li>
                <li>📞 +91 9876X XXXX</li>
                <li>📍 Pune, Maharashtra, India - 411001</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-700 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-400">
            <p>&copy; 2024 Caryanam FinServ. All rights reserved.</p>
            <div className="flex gap-4">
              <Link to="/privacy-policy" className="hover:text-[#27D3C3]">Privacy Policy</Link>
              <Link to="/terms-and-conditions" className="hover:text-[#27D3C3]">Terms & Conditions</Link>
              <Link to="/refund-policy" className="hover:text-[#27D3C3]">Refund Policy</Link>
            </div>
          </div>
        </div>
      </footer>
  );
};

export default Footer;

import logo from "../../assets/vahan-logo.jpg";
import { Link } from "react-router-dom";
import { clearAuthSession } from "../../utils/authSession";

const Footer = ({ logoutOnNavigate = false }) => {
  const handleFooterNavigate = () => {
    if (logoutOnNavigate) clearAuthSession();
  };

  return (
      <footer id="contact" className="bg-[#0a2540] px-4 sm:px-6 py-12 text-white lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            {/* Company Info */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-11 w-11 items-center justify-center">
                  <img src={logo} alt="Vahan Finserv Logo" className="h-full w-full rounded-full object-contain" />
                </div>
              <h1 className="text-xl font-bold leading-none text-white">
                Vahan <span className="text-[#1ECFC3]">Finserv</span>
              </h1>              
              
              </div>
              <p className="text-md text-gray-300">
                Your trusted partner for vehicle loans. Fast approvals, zero interest rates and no hidden charges.
              </p>
             
            </div>

            {/* Quick Links */}
            <div>
              <h2 className="font-bold mb-4">Quick Links</h2>
              <ul className="space-y-2 text-sm text-gray-300">
                <li><Link to="/#top" onClick={handleFooterNavigate} className="hover:text-[#27D3C3]">Home</Link></li>
                <li><Link to="/#our-banks" onClick={handleFooterNavigate} className="hover:text-[#27D3C3]">Our Banks</Link></li>
                <li><Link to="/#how-it-works" onClick={handleFooterNavigate} className="hover:text-[#27D3C3]">How It Works</Link></li>
                <li><Link to="/#about-us" onClick={handleFooterNavigate} className="hover:text-[#27D3C3]">About Us</Link></li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h2 className="font-bold mb-4">Resources</h2>
              <ul className="space-y-2 text-sm text-gray-300">
                <li><Link to="/faq" onClick={handleFooterNavigate} className="hover:text-[#27D3C3]">FAQs</Link></li>
                <li><Link to="/loan-calculator" onClick={handleFooterNavigate} className="hover:text-[#27D3C3]">Loan Calculator</Link></li>
            
              </ul>
              
            </div>

            {/* Contact */}
            <div>
              <h2 className="font-bold mb-4">Contact Us</h2>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>✉️ support@vahanfinserv.com</li>
                <li>📞 +91 7755994123</li>
                <li>📍 Pune, Maharashtra, India - 411001</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-700 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-400">
            <p>&copy; 2026 Vahan Finserv. All rights reserved.</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/privacy-policy" onClick={handleFooterNavigate} className="hover:text-[#27D3C3]">Privacy Policy</Link>
              <Link to="/terms-and-conditions" onClick={handleFooterNavigate} className="hover:text-[#27D3C3]">Terms & Conditions</Link>
              <Link to="/refund-policy" onClick={handleFooterNavigate} className="hover:text-[#27D3C3]">Refund Policy</Link>
            </div>
          </div>
        </div>
      </footer>
  );
};

export default Footer;

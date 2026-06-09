
import React, { useEffect } from "react";
import Header from "./Header";
import Footer from "./Footer";

const PrivacyPolicy = () => {

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "smooth",
    });
  }, []);

  return (

    < div className="bg-[#1ECFC3]/5">
    <Header />
  <div className="px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20 max-w-5xl mx-auto space-y-8">
    <h1 className="text-2xl sm:text-3xl font-bold text-[#0B2A4A]">Privacy Policy</h1>
    <p className="text-gray-600 leading-relaxed">
      At Vahan Finserv, we respect your privacy and are committed to protecting your personal information.
      This policy explains how we collect, use, and safeguard the data you share with us.
    </p>

    <section className="space-y-4">
      <h2 className="text-xl sm:text-2xl font-semibold text-[#0B2A4A]">Information We Collect</h2>
      <p className="text-gray-600 leading-relaxed">
        We collect information that you provide during registration, loan application, and document upload. This may include name,
        contact details, address, income, employment, PAN, Aadhaar, and vehicle details.
      </p>
    </section>

    <section className="space-y-4">
      <h2 className="text-xl sm:text-2xl font-semibold text-[#0B2A4A]">How We Use Your Information</h2>
      <ul className="list-disc list-inside text-gray-600 space-y-2">
        <li>To verify your identity and assess loan eligibility.</li>
        <li>To share your application with partner banks and lenders.</li>
        <li>To send important updates about your application status.</li>
        <li>To improve our platform and personalize your experience.</li>
      </ul>
    </section>

    <section className="space-y-4">
      <h2 className="text-xl sm:text-2xl font-semibold text-[#0B2A4A]">Information Sharing</h2>
      <p className="text-gray-600 leading-relaxed">
        We share information only with banks and financial partners required to process your application. We do not sell your personal data to third parties.
        We may also disclose information to comply with legal requirements or protect our rights.
      </p>
    </section>

    <section className="space-y-4">
      <h2 className="text-xl sm:text-2xl font-semibold text-[#0B2A4A]">Security</h2>
      <p className="text-gray-600 leading-relaxed">
        We use industry-standard security practices to protect your data, including encrypted storage and secure connections. However, no system is completely risk-free,
        so we recommend keeping your account credentials confidential and notifying us of suspicious activity.
      </p>
    </section>

    <section className="space-y-4">
      <h2 className="text-xl sm:text-2xl font-semibold text-[#0B2A4A]">Policy Updates</h2>
      <p className="text-gray-600 leading-relaxed">
        We may update this policy from time to time. When we do, we will post the updated version on this page. Continued use of our services after updates means you accept the new policy terms.
      </p>
    </section>
  </div>
  <Footer />
  </div>
  );
};

export default PrivacyPolicy;

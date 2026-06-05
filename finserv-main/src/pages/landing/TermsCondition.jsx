import React from "react";
import Footer from "./Footer";
import Header from "./Header";

const TermsCondition = () => (
    < div className="bg-[#1ECFC3]/5">
    <Header />
  <div className="px-8 py-20  max-w-5xl mx-auto space-y-8">
    <h1 className="text-3xl font-bold text-[#0B2A4A]">Terms and Conditions</h1>

    <p className="text-gray-600 leading-relaxed">
      Welcome to Caryanam FinServ. By using our website and applying for a vehicle loan, you agree to comply with these terms and conditions.
      These terms explain your responsibilities, eligibility requirements, and important legal disclosures.
    </p>

    <section className="space-y-4">
      <h2 className="text-2xl font-semibold text-[#0B2A4A]">Eligibility</h2>
      <p className="text-gray-600 leading-relaxed">
        You must be at least 18 years old and a resident of India to use our vehicle loan services. Applicants must provide
        accurate personal and financial information during registration and throughout the loan application process.
      </p>
    </section>

    <section className="space-y-4">
      <h2 className="text-2xl font-semibold text-[#0B2A4A]">Application Process</h2>
      <p className="text-gray-600 leading-relaxed">
        Caryanam FinServ helps you compare loan offers from our partner banks. We are not a lender. Loan approval, final interest
        rates, and loan terms are determined by the chosen bank after document verification.
      </p>
      <ul className="list-disc list-inside text-gray-600 space-y-2">
        <li>Submitting an application does not guarantee approval.</li>
        <li>Loan offers may vary based on your credit profile and bank policies.</li>
        <li>Disbursal timelines are controlled by the partner bank.</li>
      </ul>
    </section>

    <section className="space-y-4">
      <h2 className="text-2xl font-semibold text-[#0B2A4A]">Documents and Verification</h2>
      <p className="text-gray-600 leading-relaxed">
        You may need to upload identity, address, income, and vehicle documents as part of the verification process. All documents
        must be valid and authentic. Any incorrect or misleading information may result in rejection.
      </p>
    </section>

    <section className="space-y-4">
      <h2 className="text-2xl font-semibold text-[#0B2A4A]">Responsibility</h2>
      <p className="text-gray-600 leading-relaxed">
        Caryanam FinServ provides a comparison platform only. We do not provide credit directly. We are not liable for the final
        decision of partner banks, nor for any loan terms offered after approval.
      </p>
    </section>

    <section className="space-y-4">
      <h2 className="text-2xl font-semibold text-[#0B2A4A]">Changes to Terms</h2>
      <p className="text-gray-600 leading-relaxed">
        We may update these terms periodically. Please review the latest terms before submitting a new application. Continued use of
        the platform after any updates means you accept the revised terms.
      </p>
    </section>
  </div>
  <Footer />
  </div>
);

export default TermsCondition;

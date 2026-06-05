import React from "react";
import Footer from "./Footer";
import Header from "./Header";

const faqItems = [
  {
    question: "What documents are required to apply for a vehicle loan?",
    answer:
      "You typically need proof of identity, proof of address, income proof, bank statements, and vehicle details. Specific requirements may vary by partner bank.",
  },
  {
    question: "How long does loan approval take?",
    answer:
      "Most applications are processed within 24 to 72 hours after all required documents are submitted. Final timelines depend on bank verification.",
  },
  {
    question: "Can I compare multiple bank offers?",
    answer:
      "Yes. Caryanam FinServ lets you compare interest rates, EMI estimates, and loan terms from multiple banks so you can choose the best option.",
  },
  {
    question: "Is there any charge for using the platform?",
    answer:
      "No. Our platform is free to use for comparing loan offers and submitting applications. Fees are only applicable if a bank approves and disburses a loan.",
  },
  {
    question: "How do I track my application status?",
    answer:
      "You can track the application status through your account dashboard and receive updates by email or SMS as banks review your documents.",
  },
];

const Faq = () => (
    < div className="bg-[#1ECFC3]/5">
    <Header />
  <div className="px-8 py-20  max-w-5xl mx-auto space-y-8">
    <div>
      <h1 className="text-3xl font-bold text-[#0B2A4A]">Frequently Asked Questions</h1>
      <p className="text-gray-600 mt-3 leading-relaxed">
        Find answers to the most common questions about our vehicle loan application process, eligibility, and partner services.
      </p>
    </div>

    <div className="space-y-4">
      {faqItems.map((item, idx) => (
        <details key={idx} className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-[#1ECFC3]/40">
          <summary className="cursor-pointer text-lg font-semibold text-[#0B2A4A] list-none">
            {item.question}
          </summary>
          <p className="mt-3 text-gray-600 leading-relaxed">{item.answer}</p>
        </details>
      ))}
    </div>
  </div>
  <Footer />
  </div>
);

export default Faq;







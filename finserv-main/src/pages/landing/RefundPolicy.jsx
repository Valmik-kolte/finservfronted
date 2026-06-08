import React from "react";
import Footer from "./Footer";
import Header from "./Header";

const RefundPolicy = () => (
  <div className="bg-[#1ECFC3]/5">
    <Header />

    <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 sm:py-16 lg:py-20">

      <h1 className="text-2xl sm:text-3xl font-bold text-[#0B2A4A] mb-8">
        No Refund Policy
      </h1>

      <div className="space-y-6 text-gray-700 leading-relaxed">

        <p>
          At Vahan Finserv, all services related to vehicle loan assistance,
          application processing, and bank offer comparison are strictly non-refundable.
        </p>

        <p>
          Once any payment is made towards processing fees or service charges,
          it is considered final and cannot be cancelled, reversed, or refunded.
        </p>

        <p>
          We provide a loan facilitation platform and do not act as a lender.
          Any fees collected are for service support, documentation assistance,
          and application processing.
        </p>

        <p>
          By using our platform and making a payment, you agree that all charges are
          non-refundable under any circumstances.
        </p>

        <p>
          There are no exceptions to this policy unless required by applicable law.
        </p>

        <p>
          Vahan Finserv reserves the right to update this policy at any time
          without prior notice.
        </p>

      </div>

    </div>

    <Footer />
  </div>
);

export default RefundPolicy;

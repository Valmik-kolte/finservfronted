
import React, { useEffect, useMemo, useState } from "react";
import Footer from "./Footer";
import Header from "./Header";

const LoanCalculator = () => {

    useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "smooth",
    });
  }, []);

  const [loanAmount, setLoanAmount] = useState(700000);
  const [loanTerm, setLoanTerm] = useState(60);
  const [interestRate, setInterestRate] = useState(8.5);

  const monthlyRate = useMemo(() => interestRate / 100 / 12, [interestRate]);
  const monthlyPayment = useMemo(() => {
    if (!loanAmount || !loanTerm || monthlyRate <= 0) return 0;
    const rateFactor = Math.pow(1 + monthlyRate, loanTerm);
    return (loanAmount * monthlyRate * rateFactor) / (rateFactor - 1);
  }, [loanAmount, loanTerm, monthlyRate]);

  const totalPayment = useMemo(() => monthlyPayment * loanTerm, [monthlyPayment, loanTerm]);
  const totalInterest = useMemo(() => totalPayment - loanAmount, [totalPayment, loanAmount]);

  const formatCurrency = (value) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(value);

  return (
    < div className="bg-[#1ECFC3]/5">
    <Header />
    <div className="px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#0B2A4A]">Loan Calculator</h1>
        <p className="text-gray-600 mt-2 leading-relaxed">
          Estimate your monthly EMI and total interest before applying for a vehicle loan. Adjust the amount, term, and rate to compare offers.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
          <label className="block text-sm font-semibold text-[#0B2A4A]">Loan Amount</label>
          <input
            type="range"
            min="100000"
            max="2000000"
            step="50000"
            value={loanAmount}
            onChange={(e) => setLoanAmount(Number(e.target.value))}
            className="mt-4 w-full"
          />
          <p className="mt-4 text-xl font-bold text-[#112B5A]">{formatCurrency(loanAmount)}</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
          <label className="block text-sm font-semibold text-[#0B2A4A]">Loan Term</label>
          <input
            type="range"
            min="12"
            max="84"
            step="6"
            value={loanTerm}
            onChange={(e) => setLoanTerm(Number(e.target.value))}
            className="mt-4 w-full"
          />
          <p className="mt-4 text-xl font-bold text-[#112B5A]">{loanTerm} months</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
          <label className="block text-sm font-semibold text-[#0B2A4A]">Interest Rate</label>
          <input
            type="range"
            min="5"
            max="15"
            step="0.1"
            value={interestRate}
            onChange={(e) => setInterestRate(Number(e.target.value))}
            className="mt-4 w-full"
          />
          <p className="mt-4 text-xl font-bold text-[#112B5A]">{interestRate.toFixed(1)}%</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-[#1ECFC3]/20 bg-[#f8fdfc] p-4 sm:p-6 shadow-sm">
          <p className="text-sm font-semibold text-[#0B2A4A]">Estimated EMI</p>
          <p className="mt-4 text-2xl sm:text-3xl font-bold text-[#1ECFC3]">{formatCurrency(monthlyPayment)}</p>
        </div>
        <div className="rounded-3xl border border-[#1ECFC3]/20 bg-[#f8fdfc] p-4 sm:p-6 shadow-sm">
          <p className="text-sm font-semibold text-[#0B2A4A]">Total Interest</p>
          <p className="mt-4 text-2xl sm:text-3xl font-bold text-[#1ECFC3]">{formatCurrency(totalInterest)}</p>
        </div>
        <div className="rounded-3xl border border-[#1ECFC3]/20 bg-[#f8fdfc] p-4 sm:p-6 shadow-sm">
          <p className="text-sm font-semibold text-[#0B2A4A]">Total Repayment</p>
          <p className="mt-4 text-2xl sm:text-3xl font-bold text-[#1ECFC3]">{formatCurrency(totalPayment)}</p>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-[#0B2A4A]">How to use this calculator</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-gray-600">
          <li>Adjust the loan amount, tenure, and interest rate to see an instant estimate.</li>
          <li>Use the output to compare bank offers before applying.</li>
          <li>Actual EMI depends on the final terms approved by the lender.</li>
        </ul>
      </div>
    </div>
    <Footer />
    </div>
  );
};

export default LoanCalculator;



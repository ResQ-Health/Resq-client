import React from 'react';
import { Link } from 'react-router-dom';

const SupportPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#F9FAFB] pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-[#06202E] mb-8 text-center">Support Center</h1>

        <div className="bg-white shadow rounded-lg p-8 mb-8">
          <h2 className="text-xl font-semibold text-[#06202E] mb-4">Contact Us</h2>
          <p className="text-gray-600 mb-6">
            Our support team is here to help. If you have any questions or need assistance, please don't hesitate to reach out.
          </p>

          <div className="space-y-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-[#06202E]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-3 text-base text-gray-500">
                <p>Email us at:</p>
                <a href="mailto:support@resqhealth.com" className="text-[#06202E] font-medium hover:underline">support@resqhealth.com</a>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-[#06202E]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <div className="ml-3 text-base text-gray-500">
                <p>Call us at:</p>
                <a href="tel:+234707277983" className="text-[#06202E] font-medium hover:underline">+234 707 277 983</a>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center">
          <Link to="/" className="text-[#06202E] font-medium hover:underline">
            &larr; Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SupportPage;

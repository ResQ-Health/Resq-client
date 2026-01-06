import React from 'react';
import { Link } from 'react-router-dom';

const SupportPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#F6F8FA] pt-8 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-[#06202E] mb-2 text-center">Help Center</h1>
        <p className="text-gray-500 text-center mb-8">We're here to help you with any questions or issues.</p>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-8">
          <h2 className="text-xl font-semibold text-[#06202E] mb-4">Contact Support</h2>
          <p className="text-gray-600 mb-8">
            Our support team is available 24/7. Reach out to us through any of the channels below.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            <a href="mailto:support@resqhealth.com" className="flex items-start p-4 rounded-xl border border-gray-100 hover:border-[#06202E]/20 hover:bg-gray-50 transition-all group">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-[#06202E] group-hover:bg-[#06202E] group-hover:text-white transition-colors">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-900">Email Support</p>
                <p className="text-[#06202E] font-semibold mt-1">support@resqhealth.com</p>
              </div>
            </a>

            <a href="tel:+234707277983" className="flex items-start p-4 rounded-xl border border-gray-100 hover:border-[#06202E]/20 hover:bg-gray-50 transition-all group">
              <div className="flex-shrink-0 w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center text-[#06202E] group-hover:bg-[#06202E] group-hover:text-white transition-colors">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-900">Phone Support</p>
                <p className="text-[#06202E] font-semibold mt-1">+234 707 277 983</p>
              </div>
            </a>
          </div>
        </div>

        <div className="text-center">
          <Link to="/patient/settings" className="inline-flex items-center text-[#06202E] font-medium hover:underline">
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Settings
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SupportPage;

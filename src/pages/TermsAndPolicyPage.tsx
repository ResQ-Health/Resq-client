import { useNavigate } from 'react-router-dom';
import { AiOutlineArrowLeft } from 'react-icons/ai';

function TermsAndPolicyPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <AiOutlineArrowLeft className="mr-2" />
            Back
          </button>
          <h1
            style={{ fontFamily: 'Plus Jakarta Sans' }}
            className="text-3xl font-bold text-gray-900 mb-2"
          >
            ResQ Health Terms of Service and Privacy Policy
          </h1>
          <p className="text-sm text-gray-600">
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm p-8 space-y-8">
          {/* Terms of Service Section */}
          <section>
            <h2
              style={{ fontFamily: 'Plus Jakarta Sans' }}
              className="text-2xl font-semibold text-gray-900 mb-4"
            >
              1. Terms of Service
            </h2>
            
            <div className="space-y-4 text-gray-700">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">1.1 Acceptance of Terms</h3>
                <p>
                  By accessing and using ResQ Health ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">1.2 Use License</h3>
                <p>
                  Permission is granted to temporarily use ResQ Health for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
                </p>
                <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                  <li>Modify or copy the materials</li>
                  <li>Use the materials for any commercial purpose or for any public display</li>
                  <li>Attempt to decompile or reverse engineer any software contained on ResQ Health</li>
                  <li>Remove any copyright or other proprietary notations from the materials</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">1.3 Medical Disclaimer</h3>
                <p>
                  ResQ Health provides a platform for connecting patients with healthcare providers. We do not provide medical advice, diagnosis, or treatment. The information provided on this platform is for informational purposes only and should not be considered as a substitute for professional medical advice, diagnosis, or treatment.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">1.4 User Responsibilities</h3>
                <p>
                  You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account or password.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">1.5 Service Modifications</h3>
                <p>
                  ResQ Health reserves the right to modify or discontinue the Service at any time without prior notice. We shall not be liable to you or any third party for any modification, suspension, or discontinuance of the Service.
                </p>
              </div>
            </div>
          </section>

          {/* Privacy Policy Section */}
          <section>
            <h2
              style={{ fontFamily: 'Plus Jakarta Sans' }}
              className="text-2xl font-semibold text-gray-900 mb-4"
            >
              2. Privacy Policy
            </h2>
            
            <div className="space-y-4 text-gray-700">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">2.1 Information We Collect</h3>
                <p>
                  We collect information that you provide directly to us, including:
                </p>
                <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                  <li>Personal identification information (name, email address, phone number)</li>
                  <li>Health information and medical history (when booking appointments)</li>
                  <li>Payment information (processed securely through third-party payment processors)</li>
                  <li>Account credentials and preferences</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">2.2 How We Use Your Information</h3>
                <p>
                  We use the information we collect to:
                </p>
                <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                  <li>Provide, maintain, and improve our services</li>
                  <li>Process and manage your appointments</li>
                  <li>Send you important updates and notifications</li>
                  <li>Respond to your inquiries and provide customer support</li>
                  <li>Detect, prevent, and address technical issues</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">2.3 Information Sharing</h3>
                <p>
                  We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:
                </p>
                <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                  <li>With healthcare providers when you book an appointment</li>
                  <li>With service providers who assist us in operating our platform</li>
                  <li>When required by law or to protect our rights</li>
                  <li>With your explicit consent</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">2.4 Data Security</h3>
                <p>
                  We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet is 100% secure.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">2.5 Your Rights</h3>
                <p>
                  You have the right to:
                </p>
                <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                  <li>Access and receive a copy of your personal data</li>
                  <li>Rectify inaccurate or incomplete data</li>
                  <li>Request deletion of your personal data</li>
                  <li>Object to processing of your personal data</li>
                  <li>Withdraw consent at any time</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">2.6 Cookies and Tracking</h3>
                <p>
                  We use cookies and similar tracking technologies to track activity on our Service and hold certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.
                </p>
              </div>
            </div>
          </section>

          {/* User Agreement Section */}
          <section>
            <h2
              style={{ fontFamily: 'Plus Jakarta Sans' }}
              className="text-2xl font-semibold text-gray-900 mb-4"
            >
              3. User Agreement
            </h2>
            
            <div className="space-y-4 text-gray-700">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">3.1 Account Registration</h3>
                <p>
                  To use certain features of our Service, you must register for an account. You agree to provide accurate, current, and complete information during registration and to update such information to keep it accurate, current, and complete.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">3.2 Prohibited Activities</h3>
                <p>
                  You agree not to:
                </p>
                <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                  <li>Use the Service for any illegal purpose</li>
                  <li>Violate any laws in your jurisdiction</li>
                  <li>Infringe upon the rights of others</li>
                  <li>Transmit any harmful code or malware</li>
                  <li>Interfere with or disrupt the Service</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">3.3 Limitation of Liability</h3>
                <p>
                  In no event shall ResQ Health, its directors, employees, or agents be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the Service.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">3.4 Contact Information</h3>
                <p>
                  If you have any questions about these Terms and Privacy Policy, please contact us at:
                </p>
                <p className="mt-2">
                  Email: support@resqhealth.com<br />
                  Address: ResQ Health, Healthcare Technology Solutions
                </p>
              </div>
            </div>
          </section>

          {/* Footer */}
          <div className="pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-600 text-center">
              By using ResQ Health, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service and Privacy Policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TermsAndPolicyPage;


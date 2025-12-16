import React from 'react';

const ProviderPlaceholderPage: React.FC<{ title: string }> = ({ title }) => {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8">
      <h2 className="text-2xl font-semibold text-[#16202E] mb-2">{title}</h2>
      <p className="text-gray-500">This page is coming next.</p>
    </div>
  );
};

export default ProviderPlaceholderPage;



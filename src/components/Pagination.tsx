import React from 'react';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
    const getVisiblePages = () => {
        const pages = [];
        const maxVisible = 7; // Show max 7 page numbers including ellipsis

        if (totalPages <= maxVisible) {
            // Show all pages if total is small
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            // Show first 3, ellipsis, last 3
            for (let i = 1; i <= 3; i++) {
                pages.push(i);
            }
            pages.push('...');
            for (let i = totalPages - 2; i <= totalPages; i++) {
                pages.push(i);
            }
        }

        return pages;
    };

    const visiblePages = getVisiblePages();

    return (
        <div className="flex items-center justify-between border-t-[#F0F2F5] border-t-[1px] gap-4 mt-8 pt-[16px]  ">
            {/* Previous Button - Left Column */}
            <div className="flex-1 flex justify-start">
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`px-4 py-2 rounded-md border text-gray-700 font-medium transition-colors ${currentPage === 1
                        ? 'bg-gray-100/0 border-1 bg-white text-gray-400 cursor-not-allowed'
                        : 'bg-gray-50 border-gray-300 hover:bg-gray-100'
                        }`}
                >
                    Previous
                </button>
            </div>

            {/* Page Numbers - Center Column */}
            <div className="flex items-center gap-2 flex-1 justify-center">
                {visiblePages.map((page, index) => {
                    if (page === '...') {
                        return (
                            <span key={`ellipsis-${index}`} className="text-gray-700 px-2">
                                ...
                            </span>
                        );
                    }

                    const pageNumber = page as number;
                    const isActive = pageNumber === currentPage;

                    return (
                        <button
                            key={pageNumber}
                            onClick={() => onPageChange(pageNumber)}
                            className={`w-10 bg-white h-10 rounded-md border font-medium transition-colors ${isActive
                                ? 'bg-gray-100 border-gray-400 text-gray-700'
                                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                                }`}
                        >
                            {pageNumber}
                        </button>
                    );
                })}
            </div>

            {/* Next Button - Right Column */}
            <div className="flex-1 flex justify-end">
                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`px-4 py-2 rounded-md border text-gray-700 font-medium transition-colors ${currentPage === totalPages
                        ? 'bg-gray-100/0  border-1 border-gray-200 text-gray-400 cursor-not-allowed'
                        : ' bg-white border-gray-300 hover:bg-gray-100'
                        }`}
                >
                    Next
                </button>
            </div>
        </div>
    );
};

export default Pagination; 
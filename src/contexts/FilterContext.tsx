import React, { createContext, useContext, useState, ReactNode } from 'react';

interface Filter {
    id: string;
    type: 'search' | 'location' | 'date' | 'time' | 'rating' | 'special_offer';
    value: string;
    label: string;
}

interface FilterContextType {
    filters: Filter[];
    addFilter: (filter: Omit<Filter, 'id'>) => void;
    removeFilter: (filterId: string) => void;
    clearAllFilters: () => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export const useFilters = () => {
    const context = useContext(FilterContext);
    if (context === undefined) {
        throw new Error('useFilters must be used within a FilterProvider');
    }
    return context;
};

interface FilterProviderProps {
    children: ReactNode;
}

export const FilterProvider: React.FC<FilterProviderProps> = ({ children }) => {
    const [filters, setFilters] = useState<Filter[]>([]);

    const addFilter = (filter: Omit<Filter, 'id'>) => {
        setFilters(prev => {
            // Remove existing filter of the same type
            const filtered = prev.filter(f => f.type !== filter.type);
            // Add new filter
            const newFilter: Filter = {
                ...filter,
                id: `${filter.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            };
            return [...filtered, newFilter];
        });
    };

    const removeFilter = (filterId: string) => {
        setFilters(prev => prev.filter(filter => filter.id !== filterId));
    };

    const clearAllFilters = () => {
        setFilters([]);
    };

    return (
        <FilterContext.Provider value={{
            filters,
            addFilter,
            removeFilter,
            clearAllFilters
        }}>
            {children}
        </FilterContext.Provider>
    );
}; 
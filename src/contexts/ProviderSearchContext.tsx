import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ProviderSearchContextType {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isSearching: boolean;
  setIsSearching: (isSearching: boolean) => void;
}

const ProviderSearchContext = createContext<ProviderSearchContextType | undefined>(undefined);

export const ProviderSearchProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);

  return (
    <ProviderSearchContext.Provider value={{ searchQuery, setSearchQuery, isSearching, setIsSearching }}>
      {children}
    </ProviderSearchContext.Provider>
  );
};

export const useProviderSearch = () => {
  const context = useContext(ProviderSearchContext);
  if (context === undefined) {
    throw new Error('useProviderSearch must be used within a ProviderSearchProvider');
  }
  return context;
};


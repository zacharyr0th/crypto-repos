'use client';

import React, { useState, useCallback, memo } from 'react';
import { Navbar } from '@/components/layout/Header';
import LeftSidebar from '@/components/sidebar/LeftSidebar';

interface RootLayoutClientProps {
  children: React.ReactNode;
}

interface FilterState {
  selectedEcosystems: string[];
  filter: string;
  selectedLanguage: string;
  selectedLicense: string;
}

const initialFilterState: FilterState = {
  selectedEcosystems: [],
  filter: '',
  selectedLanguage: '',
  selectedLicense: '',
};

export const RootLayoutClient = memo(({ children }: RootLayoutClientProps) => {
  const [filterState, setFilterState] = useState<FilterState>(initialFilterState);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleStateChange = useCallback((key: keyof FilterState, value: string | string[]) => {
    setFilterState((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleMobileMenuToggle = useCallback(() => {
    setIsMobileMenuOpen((prev) => !prev);
  }, []);

  const handleMobileMenuClose = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <LeftSidebar
        selectedEcosystems={filterState.selectedEcosystems}
        filter={filterState.filter}
        selectedLanguage={filterState.selectedLanguage}
        selectedLicense={filterState.selectedLicense}
        onEcosystemChange={(value) => handleStateChange('selectedEcosystems', value)}
        onFilterChange={(value) => handleStateChange('filter', value)}
        onLanguageChange={(value) => handleStateChange('selectedLanguage', value)}
        onLicenseChange={(value) => handleStateChange('selectedLicense', value)}
        isOpen={isMobileMenuOpen}
        onClose={handleMobileMenuClose}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Navbar */}
        <Navbar
          ecosystem={filterState.selectedEcosystems.join(',')}
          category={filterState.filter}
          onMobileMenuToggle={handleMobileMenuToggle}
          isMobileMenuOpen={isMobileMenuOpen}
        />

        {/* Main scrollable content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
});

RootLayoutClient.displayName = 'RootLayoutClient';

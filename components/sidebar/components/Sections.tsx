/*
 * Sections.tsx
 * All sidebar section components
 */

import React, { memo, useState, useMemo } from 'react';
import { ECOSYSTEMS } from '../constants/ecosystems';
import type { EcosystemSectionProps, CategorySectionProps } from '../types';
import { SectionWrapper, SectionList, SelectedItems, ITEM_HEIGHT, VISIBLE_ITEMS } from './Common';

// Shared hook for section state management
const useSection = (
  initialId: string | undefined,
  excludeValues: string[] = [],
  isDefaultOpen = false
) => {
  const [isOpen, setIsOpen] = useState(isDefaultOpen);
  const [selectedIds, setSelectedIds] = useState<string[]>(
    initialId && !excludeValues.includes(initialId) ? [initialId] : []
  );

  const handleSelect = (
    id: string,
    onChange: (value: string[]) => void,
    onFilter: (filter: string) => void,
    filterValue?: string
  ) => {
    const isSelected = selectedIds.includes(id);
    const newSelected = isSelected ? selectedIds.filter((sid) => sid !== id) : [...selectedIds, id];

    setSelectedIds(newSelected);
    onChange(newSelected);
    onFilter(newSelected.length ? filterValue || newSelected[0] : 'all');
  };

  return { isOpen, setIsOpen, selectedIds, handleSelect };
};

// Section Components
export const EcosystemSection = memo(
  ({ selectedEcosystems, onEcosystemChange, onFilterChange }: EcosystemSectionProps) => {
    // Initialize selectedIds from the provided selectedEcosystems
    const [isOpen, setIsOpen] = useState(true);
    const [selectedIds, setSelectedIds] = useState<string[]>(selectedEcosystems || []);
    const ecosystemItems = useMemo(() => [...ECOSYSTEMS], []);

    // Update local state when props change
    React.useEffect(() => {
      setSelectedIds(selectedEcosystems || []);
    }, [selectedEcosystems]);

    const handleSelect = (id: string) => {
      const isSelected = selectedIds.includes(id);
      const newSelected = isSelected
        ? selectedIds.filter((sid) => sid !== id)
        : [...selectedIds, id];

      setSelectedIds(newSelected);
      onEcosystemChange(newSelected);
      onFilterChange(newSelected.length ? newSelected[0] : 'all');
    };

    return (
      <SectionWrapper
        title="Ecosystems"
        isOpen={isOpen}
        onToggle={() => setIsOpen((prev) => !prev)}
        selectedItems={
          <SelectedItems
            items={ecosystemItems}
            selectedIds={selectedIds}
            onRemove={(id) => handleSelect(id)}
            isCircular={true}
          />
        }
      >
        <SectionList
          items={ecosystemItems}
          selectedIds={selectedIds}
          onSelect={(id) => handleSelect(id)}
          maxHeight={ITEM_HEIGHT * VISIBLE_ITEMS}
          isCircular={true}
        />
      </SectionWrapper>
    );
  }
);

export const CategorySection = memo(
  ({ selectedCategory, onCategoryChange, onFilterChange }: CategorySectionProps) => {
    const { isOpen, setIsOpen } = useSection(selectedCategory, [], false);

    return (
      <SectionWrapper
        title="Categories"
        isOpen={isOpen}
        onToggle={() => setIsOpen((prev) => !prev)}
      >
        <div className="flex flex-col items-center justify-center text-center py-4 text-gray-500 dark:text-gray-400">
          <p className="text-sm">Coming Soon</p>
          <p className="text-xs mt-1">
            We&apos;re working on bringing you detailed repository categories
          </p>
        </div>
      </SectionWrapper>
    );
  }
);

// Add display names
EcosystemSection.displayName = 'EcosystemSection';
CategorySection.displayName = 'CategorySection';

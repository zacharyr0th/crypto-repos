/*
 * useMultiSelect.ts
 * Custom hook for managing multiple selections in the sidebar
 */

import { useState, useCallback } from 'react';

interface UseMultiSelectProps {
  initialSelected?: string[];
  excludeValues?: string[];
  isDefaultOpen?: boolean;
  onChange?: (selectedItems: string[]) => void;
}

export const useMultiSelect = ({
  initialSelected = [],
  excludeValues = [],
  isDefaultOpen = false,
  onChange,
}: UseMultiSelectProps = {}) => {
  const [isOpen, setIsOpen] = useState(isDefaultOpen);
  const [selectedIds, setSelectedIds] = useState<string[]>(
    initialSelected.filter((id) => !excludeValues.includes(id))
  );

  const handleSelect = useCallback(
    (id: string) => {
      setSelectedIds((prev) => {
        const isSelected = prev.includes(id);
        const newSelected = isSelected ? prev.filter((sid) => sid !== id) : [...prev, id];

        onChange?.(newSelected);
        return newSelected;
      });
    },
    [onChange]
  );

  const handleRemove = useCallback(
    (id: string) => {
      setSelectedIds((prev) => {
        const newSelected = prev.filter((sid) => sid !== id);
        onChange?.(newSelected);
        return newSelected;
      });
    },
    [onChange]
  );

  const clearSelections = useCallback(() => {
    setSelectedIds([]);
    onChange?.([]);
  }, [onChange]);

  return {
    isOpen,
    setIsOpen,
    selectedIds,
    handleSelect,
    handleRemove,
    clearSelections,
  };
};

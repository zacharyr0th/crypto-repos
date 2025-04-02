/*
 * Common.tsx
 * Shared components and types for sidebar sections
 */

import React, { memo } from 'react';
import Image from 'next/image';
import { FaTimes, FaChevronDown, FaChevronRight } from 'react-icons/fa';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Types
interface SectionWrapperProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  selectedItems?: React.ReactNode;
  children: React.ReactNode;
}

interface SectionItemProps {
  id: string;
  name: string;
  icon: React.ReactNode | string;
  description?: string;
  isSelected: boolean;
  onClick: () => void;
  onRemove?: () => void;
  isCircular?: boolean;
}

interface SectionListProps {
  items: {
    id: string;
    name: string;
    icon: React.ReactNode | string;
    description?: string;
  }[];
  selectedIds: string[];
  onSelect: (id: string) => void;
  maxHeight?: number;
  isCircular?: boolean;
}

interface SelectedItemsProps {
  items: {
    id: string;
    name: string;
    icon: React.ReactNode | string;
    description?: string;
  }[];
  selectedIds: string[];
  onRemove: (id: string) => void;
  isCircular?: boolean;
}

// Components
export const SectionWrapper = ({
  title,
  isOpen,
  onToggle,
  selectedItems,
  children,
}: SectionWrapperProps) => {
  return (
    <div className="px-6">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={onToggle}
          className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <span>{title}</span>
          {isOpen ? <FaChevronDown className="w-3 h-3" /> : <FaChevronRight className="w-3 h-3" />}
        </button>
      </div>
      {!isOpen && selectedItems}
      {isOpen && children}
    </div>
  );
};

export const SectionItem = memo(
  ({
    name,
    icon,
    description,
    isSelected,
    onClick,
    onRemove,
    isCircular = false,
  }: Omit<SectionItemProps, 'id'>) => {
    const button = (
      <button
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
          isSelected
            ? 'bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white font-medium'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900/50'
        }`}
      >
        <span
          className={`flex items-center justify-center ${isCircular ? 'w-6 h-6 overflow-hidden rounded-full' : ''} ${
            isSelected ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'
          }`}
        >
          {typeof icon === 'string' ? (
            <Image
              src={icon}
              alt={name}
              width={20}
              height={20}
              className={isCircular ? 'w-full h-full object-cover' : 'w-5 h-5 object-contain'}
              loading="lazy"
              sizes="20px"
            />
          ) : (
            <div className="w-5 h-5">{icon}</div>
          )}
        </span>
        <span className="truncate">{name}</span>
      </button>
    );

    return (
      <div className="relative">
        {description ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>{button}</TooltipTrigger>
              <TooltipContent side="right" className="max-w-[300px] whitespace-pre-wrap">
                <p className="text-sm">{description}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          button
        )}

        {isSelected && onRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <FaTimes className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  }
);

SectionItem.displayName = 'SectionItem';

export const SectionList = memo(
  ({ items, selectedIds, onSelect, maxHeight = 154, isCircular = false }: SectionListProps) => {
    return (
      <div
        className="space-y-1 pl-1 overflow-y-auto pr-1 scrollbar-hide"
        style={{
          height: `${maxHeight}px`,
          maxHeight: `${maxHeight}px`,
        }}
      >
        {items.map((item) => (
          <SectionItem
            key={item.id}
            {...item}
            isSelected={selectedIds.includes(item.id)}
            onClick={() => onSelect(item.id)}
            onRemove={() => onSelect(item.id)}
            isCircular={isCircular}
          />
        ))}
      </div>
    );
  }
);

SectionList.displayName = 'SectionList';

export const SelectedItems = memo(
  ({ items, selectedIds, onRemove, isCircular = false }: SelectedItemsProps) => {
    const selectedItems = items.filter((item) => selectedIds.includes(item.id));

    if (selectedItems.length === 0) return null;

    return (
      <div className="pl-1 mb-2 space-y-1">
        {selectedItems.map((item) => (
          <SectionItem
            key={item.id}
            {...item}
            isSelected={true}
            onClick={() => {}}
            onRemove={() => onRemove(item.id)}
            isCircular={isCircular}
          />
        ))}
      </div>
    );
  }
);

SelectedItems.displayName = 'SelectedItems';

// Constants
export const ITEM_HEIGHT = 44; // px
export const VISIBLE_ITEMS = 5.5;

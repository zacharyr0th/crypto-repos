// Purpose: Provides an enhanced search interface for repositories with advanced filtering
import React, { useCallback, useRef, useState } from 'react';
import {
  Search as SearchIcon,
  X,
  LayoutGrid,
  List,
  Filter,
  Star,
  GitFork,
  Eye,
  Clock,
  CalendarPlus,
  Text,
  Layers,
  FolderTree,
  ArrowDown,
  ArrowUp,
} from 'lucide-react';
import { useDebouncedCallback } from 'use-debounce';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { SearchFilters } from '@/lib/types';

interface SearchProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  gridLayout: 'single' | 'compact';
  onToggleLayout: () => void;
  onFilterChange?: (filters: SearchFilters) => void;
  ecosystem?: string;
  category?: string;
}

const SearchControls = React.memo(
  ({ gridLayout, onToggleLayout }: Pick<SearchProps, 'gridLayout' | 'onToggleLayout'>) => (
    <div className="flex items-center gap-2 shrink-0">
      <button
        onClick={onToggleLayout}
        className="p-1.5 rounded-md hover:bg-muted transition-colors"
        title={gridLayout === 'single' ? 'Switch to compact view' : 'Switch to detailed view'}
      >
        {gridLayout === 'single' ? (
          <LayoutGrid className="h-4 w-4" />
        ) : (
          <List className="h-4 w-4" />
        )}
      </button>
      <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
        <span className="text-xs">⌘</span>K
      </kbd>
    </div>
  )
);
SearchControls.displayName = 'SearchControls';

export const Search = React.memo(
  ({
    searchTerm: externalSearchTerm,
    onSearchChange,
    gridLayout,
    onToggleLayout,
    onFilterChange,
    ecosystem,
    category,
  }: SearchProps) => {
    const [internalValue, setInternalValue] = useState(externalSearchTerm);
    const [filters, setFilters] = useState<SearchFilters>({});
    const [showFilters, setShowFilters] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const debouncedOnChange = useDebouncedCallback((value: string) => {
      onSearchChange(value);
    }, 300);

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setInternalValue(value);
        debouncedOnChange(value);
      },
      [debouncedOnChange]
    );

    const handleClear = useCallback(() => {
      setInternalValue('');
      onSearchChange('');
      inputRef.current?.focus();
    }, [onSearchChange]);

    const handleFilterChange = useCallback(
      (newFilters: Partial<SearchFilters>) => {
        const updatedFilters = { ...filters, ...newFilters };
        setFilters(updatedFilters);
        onFilterChange?.(updatedFilters);
      },
      [filters, onFilterChange]
    );

    const activeFiltersCount = Object.keys(filters).length;

    return (
      <div className="space-y-4">
        <div className="flex items-center w-full rounded-xl border shadow-md h-12 bg-background">
          <div className="flex-1 flex items-center px-3">
            <SearchIcon className="h-4 w-4 shrink-0 opacity-50 mr-2" />
            <input
              ref={inputRef}
              type="text"
              value={internalValue}
              onChange={handleChange}
              placeholder="Search here or click on a repository to view more details"
              className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground h-full w-full"
            />
            {internalValue && (
              <button
                onClick={handleClear}
                className="p-1.5 rounded-md hover:bg-muted transition-colors"
                title="Clear search"
              >
                <X className="h-4 w-4 opacity-50" />
              </button>
            )}
          </div>

          <div className="flex items-center px-3 border-l h-full gap-2">
            <Popover open={showFilters} onOpenChange={setShowFilters}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  {activeFiltersCount > 0 && (
                    <Badge
                      variant="secondary"
                      className="h-5 w-5 rounded-full p-0 flex items-center justify-center"
                    >
                      {activeFiltersCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Sort By</h4>
                    <Select
                      value={filters.sortBy}
                      onValueChange={(value) =>
                        handleFilterChange({ sortBy: value as SearchFilters['sortBy'] })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sort by..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="stars">
                          <div className="flex items-center gap-2">
                            <Star className="h-4 w-4" />
                            Stars
                          </div>
                        </SelectItem>
                        <SelectItem value="forks">
                          <div className="flex items-center gap-2">
                            <GitFork className="h-4 w-4" />
                            Forks
                          </div>
                        </SelectItem>
                        <SelectItem value="watchers">
                          <div className="flex items-center gap-2">
                            <Eye className="h-4 w-4" />
                            Watchers
                          </div>
                        </SelectItem>
                        <SelectItem value="updated">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Last Updated
                          </div>
                        </SelectItem>
                        <SelectItem value="created">
                          <div className="flex items-center gap-2">
                            <CalendarPlus className="h-4 w-4" />
                            Created Date
                          </div>
                        </SelectItem>
                        <SelectItem value="name">
                          <div className="flex items-center gap-2">
                            <Text className="h-4 w-4" />
                            Repository Name
                          </div>
                        </SelectItem>
                        <SelectItem value="ecosystem">
                          <div className="flex items-center gap-2">
                            <Layers className="h-4 w-4" />
                            Ecosystem
                          </div>
                        </SelectItem>
                        <SelectItem value="category">
                          <div className="flex items-center gap-2">
                            <FolderTree className="h-4 w-4" />
                            Category
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    <div className="flex items-center gap-2 mt-2">
                      <label className="text-sm font-medium">Order:</label>
                      <Select
                        value={filters.sortOrder}
                        onValueChange={(value) =>
                          handleFilterChange({ sortOrder: value as 'asc' | 'desc' })
                        }
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue placeholder="Select order..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="desc">
                            <div className="flex items-center gap-2">
                              <ArrowDown className="h-4 w-4" />
                              Descending
                            </div>
                          </SelectItem>
                          <SelectItem value="asc">
                            <div className="flex items-center gap-2">
                              <ArrowUp className="h-4 w-4" />
                              Ascending
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">Language</h4>
                    <Select
                      value={filters.language}
                      onValueChange={(value) => handleFilterChange({ language: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select language..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="typescript">TypeScript</SelectItem>
                        <SelectItem value="javascript">JavaScript</SelectItem>
                        <SelectItem value="rust">Rust</SelectItem>
                        <SelectItem value="go">Go</SelectItem>
                        <SelectItem value="python">Python</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">Minimum Stars</h4>
                    <Select
                      value={filters.stars?.toString()}
                      onValueChange={(value) => handleFilterChange({ stars: parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select minimum stars..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10+ stars</SelectItem>
                        <SelectItem value="50">50+ stars</SelectItem>
                        <SelectItem value="100">100+ stars</SelectItem>
                        <SelectItem value="1000">1000+ stars</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFilters({});
                        onFilterChange?.({});
                      }}
                    >
                      Reset Filters
                    </Button>
                    <Button size="sm" onClick={() => setShowFilters(false)}>
                      Apply Filters
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <div className="h-4 w-px bg-border" />

            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleLayout}
              title={gridLayout === 'single' ? 'Switch to compact view' : 'Switch to single view'}
            >
              {gridLayout === 'single' ? (
                <LayoutGrid className="h-4 w-4" />
              ) : (
                <List className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Active Filters Display */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap gap-2">
            {filters.language && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Language: {filters.language}
                <button onClick={() => handleFilterChange({ language: undefined })}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filters.stars && (
              <Badge variant="secondary" className="flex items-center gap-1">
                {filters.stars}+ stars
                <button onClick={() => handleFilterChange({ stars: undefined })}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filters.sortBy && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Sorted by: {filters.sortBy}
                <button onClick={() => handleFilterChange({ sortBy: undefined })}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
          </div>
        )}
      </div>
    );
  }
);

Search.displayName = 'Search';

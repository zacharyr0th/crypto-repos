/*
 * useFilterState.ts
 * Manages filter state and related actions with improved performance and type safety
 */

import { useReducer, useMemo, useCallback } from 'react';
import { useDebounce } from 'use-debounce';

// Define filter state interface
export interface FilterState {
  ecosystem: string;
  searchQuery: string;
  selectedLanguage: string;
  selectedLicense: string;
  selectedFramework: string;
  searchTerm: string;
  filter: string;
}

// Create a union type of all possible action types
const ActionTypes = {
  SET_ECOSYSTEM: 'SET_ECOSYSTEM',
  SET_SEARCH_QUERY: 'SET_SEARCH_QUERY',
  SET_SELECTED_LANGUAGE: 'SET_SELECTED_LANGUAGE',
  SET_SELECTED_LICENSE: 'SET_SELECTED_LICENSE',
  SET_SELECTED_FRAMEWORK: 'SET_SELECTED_FRAMEWORK',
  SET_FILTER: 'SET_FILTER',
  SET_SEARCH_TERM: 'SET_SEARCH_TERM',
} as const;

// Create a more type-safe action using discriminated union
type FilterAction = {
  [K in keyof typeof ActionTypes]: {
    type: (typeof ActionTypes)[K];
    payload: string;
  };
}[keyof typeof ActionTypes];

// Initialize with default values
const initialFilterState: FilterState = {
  ecosystem: 'all',
  searchQuery: '',
  selectedLanguage: '',
  selectedLicense: '',
  selectedFramework: '',
  searchTerm: '',
  filter: '',
};

// Map action types to state keys for more maintainable reducer
const actionToStateKey: Record<(typeof ActionTypes)[keyof typeof ActionTypes], keyof FilterState> =
  {
    [ActionTypes.SET_ECOSYSTEM]: 'ecosystem',
    [ActionTypes.SET_SEARCH_QUERY]: 'searchQuery',
    [ActionTypes.SET_SELECTED_LANGUAGE]: 'selectedLanguage',
    [ActionTypes.SET_SELECTED_LICENSE]: 'selectedLicense',
    [ActionTypes.SET_SELECTED_FRAMEWORK]: 'selectedFramework',
    [ActionTypes.SET_FILTER]: 'filter',
    [ActionTypes.SET_SEARCH_TERM]: 'searchTerm',
  };

// Simplified reducer that uses the mapping
const filterReducer = (state: FilterState, action: FilterAction): FilterState => {
  const stateKey = actionToStateKey[action.type];
  if (stateKey) {
    return { ...state, [stateKey]: action.payload };
  }
  return state;
};

export const useFilterState = () => {
  const [state, dispatch] = useReducer(filterReducer, initialFilterState);

  // Debounce the filter state for performance
  const [debouncedState] = useDebounce(state, 300);

  // Memoize action creators for performance
  const actions = useMemo(
    () => ({
      setEcosystem: useCallback(
        (payload: string) => dispatch({ type: ActionTypes.SET_ECOSYSTEM, payload }),
        []
      ),
      setSearchQuery: useCallback(
        (payload: string) => dispatch({ type: ActionTypes.SET_SEARCH_QUERY, payload }),
        []
      ),
      setSelectedLanguage: useCallback(
        (payload: string) => dispatch({ type: ActionTypes.SET_SELECTED_LANGUAGE, payload }),
        []
      ),
      setSelectedLicense: useCallback(
        (payload: string) => dispatch({ type: ActionTypes.SET_SELECTED_LICENSE, payload }),
        []
      ),
      setSelectedFramework: useCallback(
        (payload: string) => dispatch({ type: ActionTypes.SET_SELECTED_FRAMEWORK, payload }),
        []
      ),
      setFilter: useCallback(
        (payload: string) => dispatch({ type: ActionTypes.SET_FILTER, payload }),
        []
      ),
      setSearchTerm: useCallback(
        (payload: string) => dispatch({ type: ActionTypes.SET_SEARCH_TERM, payload }),
        []
      ),
    }),
    []
  );

  return {
    state: debouncedState,
    immediateState: state,
    actions,
  };
};

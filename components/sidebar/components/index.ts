/*
 * index.ts
 * Exports all sidebar components and types for better organization and type safety
 */

// Common components and types
export {
  SectionWrapper,
  SectionItem,
  SectionList,
  SelectedItems,
  ITEM_HEIGHT,
  VISIBLE_ITEMS,
} from './Common';

// Section components
export { EcosystemSection, CategorySection } from './Sections';

// Footer component
export { default as SocialFooter } from './SocialFooter';
export { default as StandalonePages } from './StandalonePages';

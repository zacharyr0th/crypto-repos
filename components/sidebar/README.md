# Sidebar Component

A modular, responsive sidebar component for navigating and filtering blockchain repositories.

## Directory Structure

```
sidebar/
├── README.md                 # Documentation
├── LeftSidebar.tsx           # Main sidebar component
├── constants/                # Shared constants
│   ├── index.ts              # Constants barrel file
│   ├── ecosystems.ts         # Blockchain ecosystems
│   ├── languages.ts          # Programming languages
│   └── licenses.ts           # Software licenses
├── types.ts                  # Type definitions
├── index.ts                  # Main exports
├── sidebar.module.css        # Styles
└── components/               # Subcomponents
    ├── index.ts              # Component exports
    ├── EcosystemSection.tsx  # Ecosystem selection
    ├── CategorySection.tsx   # Category selection
    ├── LanguageSection.tsx   # Language filtering
    ├── LicenseSection.tsx    # License filtering
    ├── SocialFooter.tsx      # Social links and stats
    └── StandalonePageLinks.tsx # Standalone page navigation
```

## Usage

```tsx
import { LeftSidebar } from '../components/sidebar';
// or
import LeftSidebar from '../components/sidebar';

// In your component
<LeftSidebar
  ecosystem="ethereum"
  filter="popular"
  enrichmentStats={enrichmentStats}
  onEcosystemChange={handleEcosystemChange}
  onFilterChange={handleFilterChange}
  selectedLanguage="typescript"
  onLanguageChange={handleLanguageChange}
  selectedLicense="mit"
  onLicenseChange={handleLicenseChange}
  isOpen={isSidebarOpen}
  onClose={closeSidebar}
/>;
```

## Components

### LeftSidebar

Main container component that organizes all sidebar sections.

### Section Components

- **EcosystemSection**: Blockchain ecosystem selection (Ethereum, Bitcoin, etc.)
- **CategorySection**: Category filtering options
- **LanguageSection**: Programming language filtering (JavaScript, Rust, etc.)
- **LicenseSection**: License filtering (MIT, Apache, etc.)
- **StandalonePageLinks**: Links to standalone pages (Contributors, Verified, Popular)
- **SocialFooter**: Social media links and repository stats

## Styling

Styles are defined in `sidebar.module.css` using CSS modules with Tailwind utility classes.

## Responsive Behavior

The sidebar is responsive with different behaviors:

- Desktop: Always visible as a fixed sidebar
- Mobile: Hidden by default, can be toggled with a menu button

## Type Definitions

All type definitions are centralized in `types.ts` for better maintainability.

## Constants

Shared constants are organized in the `constants/` directory:

- `ecosystems.ts`: Blockchain ecosystem options
- `languages.ts`: Programming language options
- `licenses.ts`: Software license options

## Customization

To add new filtering options:

1. Add new constants to the appropriate file in `constants/`
2. Update relevant type definitions in `types.ts`
3. Modify or create component to use the new options
4. Update the main `LeftSidebar` component to include the new section

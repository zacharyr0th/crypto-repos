export type Language = {
  id: string;
  name: string;
  color?: string;
};

export type License = {
  id: string;
  name: string;
  description?: string;
};

export interface LeftSidebarProps {
  selectedEcosystems: string[];
  filter: string;
  selectedLanguage: string;
  selectedLicense: string;
  onEcosystemChange: (value: string[]) => void;
  onFilterChange: (value: string) => void;
  onLanguageChange: (value: string) => void;
  onLicenseChange: (value: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

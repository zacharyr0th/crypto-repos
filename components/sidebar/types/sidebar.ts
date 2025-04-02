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

export type EcosystemOption = {
  id: string;
  name: string;
  icon: string;
  priority: boolean;
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

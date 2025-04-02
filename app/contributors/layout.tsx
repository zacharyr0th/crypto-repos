import { RootLayoutClient } from '@/components/layout/RootLayoutClient';
import { Metadata, Viewport } from 'next';

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
};

export const metadata: Metadata = {
  title: 'Contributors - Crypto Repos',
  description: 'The most active developers working on projects in the crypto-ecosystems directory',
};

export default function ContributorsLayout({ children }: { children: React.ReactNode }) {
  return <RootLayoutClient>{children}</RootLayoutClient>;
}

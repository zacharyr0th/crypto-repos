import React from 'react';
import { ThemeProvider } from '@/components/layout/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import { GeistMono } from 'geist/font/mono';
import { RootLayoutClient } from '@/components/layout/RootLayoutClient';
import { ErrorBoundaryWrapper } from '@/components/layout/ErrorBoundaryWrapper';
import TanstackProvider from './providers/TanstackProvider';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { SEO } from '@/lib/seo';
import './globals.css';

const config = await SEO.generateSiteConfig();
export const viewport = config.viewportConfig;
export const metadata = {
  ...config.metadataConfig,
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning className={GeistMono.className}>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TanstackProvider>
            <ErrorBoundaryWrapper useQueryBoundary={true}>
              <RootLayoutClient>{children}</RootLayoutClient>
            </ErrorBoundaryWrapper>
          </TanstackProvider>
          <Toaster />
          <Analytics />
          <SpeedInsights />
        </ThemeProvider>
      </body>
    </html>
  );
}

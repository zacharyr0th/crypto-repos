/*
 * SocialFooter.tsx
 * Footer component for the sidebar with social links and theme toggle
 */

import React, { memo } from 'react';
import { FaGlobe, FaGithub } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ModeToggle } from '@/components/layout/mode-toggle';

/**
 * Social footer component with branded links and theme toggle
 */
const SocialFooter = memo(() => {
  const socialLinks = [
    {
      href: 'https://x.com/crypto-repos',
      label: 'Follow us on X (Twitter)',
      icon: <FaXTwitter className="h-5 w-5" />,
      tooltip: 'X (Twitter)',
    },
    {
      href: 'https://github.com/zacharyr0th/crypto-repos',
      label: 'View the source code',
      icon: <FaGithub className="h-5 w-5" />,
      tooltip: 'GitHub',
    },
    {
      href: 'https://zacharyr0th.com',
      label: 'Visit our website',
      icon: <FaGlobe className="h-5 w-5" />,
      tooltip: 'Website',
    },
  ];

  return (
    <footer className="mt-auto border-t border-border/40 py-3">
      <div className="flex items-center justify-between w-full px-4">
        <div className="flex items-center justify-around w-full gap-3">
          <TooltipProvider>
            {socialLinks.map((link, index) => (
              <Tooltip key={index}>
                <TooltipTrigger asChild>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground transition-colors p-2 rounded-full hover:bg-accent/50"
                    aria-label={link.label}
                  >
                    {link.icon}
                  </a>
                </TooltipTrigger>
                <TooltipContent side="bottom">{link.tooltip}</TooltipContent>
              </Tooltip>
            ))}
            <Tooltip>
              <TooltipTrigger asChild>
                <ModeToggle />
              </TooltipTrigger>
              <TooltipContent side="bottom">Theme Toggle</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </footer>
  );
});

SocialFooter.displayName = 'SocialFooter';

export default SocialFooter;

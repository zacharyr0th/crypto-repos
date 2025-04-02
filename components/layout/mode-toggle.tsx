'use client';

import React, { memo, useCallback } from 'react';
import { Sun } from 'lucide-react';
import { FaMoon } from 'react-icons/fa';
import { useTheme } from 'next-themes';

export const ModeToggle = memo(() => {
  const { setTheme, theme } = useTheme();

  const handleToggle = useCallback(() => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  }, [setTheme, theme]);

  return (
    <button
      onClick={handleToggle}
      className="text-muted-foreground hover:text-foreground transition-colors p-2 rounded-full hover:bg-accent/50"
      aria-label="Toggle theme"
    >
      {theme === 'light' ? <Sun className="h-5 w-5" /> : <FaMoon className="h-5 w-5" />}
    </button>
  );
});

ModeToggle.displayName = 'ModeToggle';

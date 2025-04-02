/*
 * ContributorHeader component
 * Displays the header section of the contributors page
 */

'use client';

import React from 'react';
import { FaUsers } from 'react-icons/fa';

const HeaderLink = React.memo(() => (
  <a
    href="https://github.com/electric-capital/crypto-ecosystems"
    target="_blank"
    rel="noopener noreferrer"
    className="text-indigo-400 hover:text-indigo-300 hover:underline"
  >
    crypto-ecosystems directory
  </a>
));

const HeaderIcon = React.memo(() => (
  <FaUsers className="h-8 w-8 text-indigo-500 dark:text-indigo-400" />
));

HeaderLink.displayName = 'HeaderLink';
HeaderIcon.displayName = 'HeaderIcon';

export const ContributorHeader = React.memo(function ContributorHeader() {
  return (
    <div className="sm:flex sm:items-center sm:justify-between mb-8">
      <div>
        <div className="flex items-center">
          <HeaderIcon />
          <h1 className="ml-3 text-2xl font-bold text-gray-200">Top Contributors</h1>
        </div>
        <p className="mt-6 text-sm text-gray-400">
          The most active developers working on projects in the <HeaderLink />
        </p>
      </div>
    </div>
  );
});

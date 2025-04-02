/*
 * StandalonePages.tsx
 * Standalone page navigation buttons for the sidebar
 */

import React from 'react';
import Link from 'next/link';
import { FaUsers, FaCheckCircle } from 'react-icons/fa';

const StandalonePages = () => {
  return (
    <div className="py-3">
      <Link
        href="/contributors"
        className="flex items-center w-full px-6 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800/70 transition-colors group"
      >
        <FaUsers className="w-5 h-5 mr-3 text-indigo-500 dark:text-indigo-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-300" />
        <span className="group-hover:text-indigo-600 dark:group-hover:text-indigo-300">
          Contributors
        </span>
      </Link>
      <Link
        href="/verified"
        className="flex items-center w-full px-6 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800/70 transition-colors group"
      >
        <FaCheckCircle className="w-5 h-5 mr-3 text-green-500 dark:text-green-400 group-hover:text-green-600 dark:group-hover:text-green-300" />
        <span className="group-hover:text-green-600 dark:group-hover:text-green-300">Verified</span>
      </Link>
    </div>
  );
};

export default StandalonePages;

/*
 * licenses.ts
 * Constants for software licenses
 */

import type { License } from '../types/sidebar';

/**
 * License options for repository filtering
 */
export const licenses: License[] = [
  {
    id: 'mit',
    name: 'MIT',
    description: 'A permissive license that is short and to the point.',
  },
  {
    id: 'apache-2.0',
    name: 'Apache 2.0',
    description: 'A permissive license that also provides an express grant of patent rights.',
  },
  {
    id: 'gpl-3.0',
    name: 'GPL 3.0',
    description:
      'Permissions of this strong copyleft license are conditioned on making available complete source code.',
  },
  {
    id: 'bsd-3-clause',
    name: 'BSD 3-Clause',
    description:
      'A permissive license similar to the BSD 2-Clause License, but with a 3rd clause that prohibits others from using the name of the project or its contributors to promote derived products without written consent.',
  },
];

/*
 * Verified page
 * Displays verified repositories in the crypto ecosystem
 */

import React from 'react';
import { FaCheckCircle } from 'react-icons/fa';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Metadata, Viewport } from 'next';

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
};

export const metadata: Metadata = {
  title: 'Verified Repositories - Crypto Repos',
  description: 'Browse verified and trusted repositories in the crypto ecosystem',
};

const verifiedRepos = [
  {
    name: 'bitcoin/bitcoin',
    status: 'Official',
    ecosystem: 'Bitcoin',
    stars: 74500,
    verifiedDate: '2024-01-15',
  },
  {
    name: 'ethereum/go-ethereum',
    status: 'Official',
    ecosystem: 'Ethereum',
    stars: 43200,
    verifiedDate: '2024-02-01',
  },
  {
    name: 'solana-labs/solana',
    status: 'Official',
    ecosystem: 'Solana',
    stars: 28900,
    verifiedDate: '2024-02-15',
  },
  {
    name: 'cosmos/cosmos-sdk',
    status: 'Official',
    ecosystem: 'Cosmos',
    stars: 5600,
    verifiedDate: '2024-03-01',
  },
  {
    name: 'polkadot-js/api',
    status: 'Official',
    ecosystem: 'Polkadot',
    stars: 2300,
    verifiedDate: '2024-03-10',
  },
];

export default function VerifiedPage() {
  return (
    <div className="app-container">
      <div className="main-content">
        <div className="content-area">
          <main>
            <div>
              <div className="sm:flex sm:items-center sm:justify-between mb-8">
                <div>
                  <div className="flex items-center">
                    <FaCheckCircle className="h-8 w-8 text-green-500 dark:text-green-400" />
                    <h1 className="ml-3 text-2xl font-bold text-gray-200">Verified Repositories</h1>
                  </div>
                  <p className="mt-2 text-sm text-gray-400">
                    Curated collection of trusted and verified crypto projects
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-gray-800">
                <Table>
                  <TableCaption>
                    Official and verified repositories in the crypto ecosystem.
                  </TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Repository</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ecosystem</TableHead>
                      <TableHead>Stars</TableHead>
                      <TableHead>Verified Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {verifiedRepos.map((repo) => (
                      <TableRow key={repo.name}>
                        <TableCell className="font-medium text-green-400">{repo.name}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center">
                            <FaCheckCircle className="w-4 h-4 mr-1.5 text-green-500" />
                            {repo.status}
                          </span>
                        </TableCell>
                        <TableCell>{repo.ecosystem}</TableCell>
                        <TableCell>{repo.stars.toLocaleString()}</TableCell>
                        <TableCell>{new Date(repo.verifiedDate).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

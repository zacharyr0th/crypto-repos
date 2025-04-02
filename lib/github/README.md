# GitHub Services Documentation

## Overview

This document provides comprehensive documentation of the GitHub services directory (`lib/github/`) which is responsible for fetching, processing, and storing GitHub repository data, particularly focused on cryptocurrency and blockchain-related repositories.

## Directory Structure

```
lib/github/
├── client.ts (4.5KB) - GitHub API client configuration
├── config.ts (992B) - Database configuration
├── contributors.ts (6.0KB) - Contributor data management
├── language-service.ts (3.1KB) - Repository language statistics
├── parser.ts (1.5KB) - Ecosystem file parser
├── rate-limiter.ts (5.0KB) - GitHub API rate limiting
└── repository-service.ts (6.3KB) - Core repository management
```

## Core Components

### 1. GitHub Client (`client.ts`)

#### Purpose

- Provides unified GitHub API access
- Manages authentication and API calls
- Handles response caching

#### Key Features

```typescript
export const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
  userAgent: 'Crypto-Repos-Collector',
  retry: {
    enabled: true,
    retries: 3,
    doNotRetry: [404, 422, 401, 400],
  },
});
```

#### Dependencies

- `@octokit/rest` - GitHub API client
- Environment variable: `GITHUB_TOKEN`
- File system for caching
- Rate limiter service

### 2. Database Configuration (`config.ts`)

#### Database Settings

```typescript
export const dbConfig: PoolConfig = {
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD,
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'crypto_repos',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};
```

#### Required Environment Variables

- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_HOST`
- `POSTGRES_PORT`
- `POSTGRES_DB`

### 3. Contributors Service (`contributors.ts`)

#### Features

- Fetches repository contributor data
- Caches contributor information
- Manages contributor database records

#### Database Schema

```sql
CREATE TABLE repository_contributors (
  repository_id INTEGER,
  contributor_login TEXT,
  contributor_html_url TEXT,
  contributor_avatar_url TEXT,
  contributions_count INTEGER
);
```

### 4. Language Service (`language-service.ts`)

#### Purpose

- Tracks repository language statistics
- Stores primary language information
- Maintains language byte counts

#### Data Structure

```typescript
export interface LanguageStats {
  [language: string]: number; // language name -> bytes of code
}
```

### 5. Parser (`parser.ts`)

#### Functionality

- Processes ecosystem TOML files
- Extracts GitHub repository URLs
- Validates repository information

#### Supported Ecosystems

Located in `lib/ecosystems/`:

- ethereum.toml (4.1MB)
- aptos.toml (388KB)
- cosmos-network.toml (433KB)
- celo.toml (439KB)
- bnb.toml (961KB)
- bitcoin.toml (357KB)
- base.toml (111KB)
- avalanche.toml (252KB)
- arbitrum.toml (242KB)
- ton.toml (219KB)
- zksync.toml (118KB)
- sui.toml (271KB)
- solana.toml (3.1MB)
- polygon.toml (1.4MB)
- scroll.toml (81KB)
- polkadot-network.toml (662KB)
- near.toml (829KB)
- optimism.toml (291KB)
- kusama.toml (9.1KB)
- fantom.toml (200KB)

### 6. Rate Limiter (`rate-limiter.ts`)

#### Configuration

```typescript
private readonly BASE_DELAY = 1000; // 1s base delay
private readonly MAX_DELAY = 5000; // 5s maximum delay
private readonly BURST_SIZE = 15; // Process in bursts of 15
private readonly BURST_DELAY = 10000; // 10s between bursts
private readonly HOURLY_LIMIT = 4500; // Below GitHub's 5000 limit
```

#### Features

- Adaptive rate limiting
- Queue management
- Burst processing
- Error handling

### 7. Repository Service (`repository-service.ts`)

#### Core Features

- Repository data management
- Batch processing
- Database synchronization
- Cache management

#### Database Schema

```sql
CREATE TABLE repositories (
  id INTEGER PRIMARY KEY,
  name TEXT,
  full_name TEXT,
  description TEXT,
  html_url TEXT,
  homepage TEXT,
  language TEXT,
  stargazers_count INTEGER,
  watchers_count INTEGER,
  forks_count INTEGER,
  fork BOOLEAN,
  owner_html_url TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  pushed_at TIMESTAMP,
  license_name TEXT,
  languages_url TEXT,
  ecosystem TEXT,
  category TEXT,
  created_in_db TIMESTAMP,
  updated_in_db TIMESTAMP
);

CREATE TABLE repository_topics (
  repository_id INTEGER,
  topic TEXT
);
```

## Database Integration

### Queue System

- Uses `dbQueue` for managing concurrent database operations
- Maximum concurrent operations: 5
- Implements retry logic
- Transaction support

### Tables

1. `repositories` - Core repository information
2. `repository_contributors` - Contributor data
3. `repository_topics` - Repository topics/tags

## Caching System

### Cache Directory

- Location: `./cache/`
- TTL: 24 hours
- Cached Data:
  - Repository metadata
  - Contributor information
  - Language statistics

### Cache Format

```typescript
interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}
```

## Dependencies

### External Packages

- `@octokit/rest` - GitHub API client
- `pg` - PostgreSQL client
- `toml` - TOML file parsing
- Various Node.js built-in modules

### Environment Variables

```bash
GITHUB_TOKEN=<github_api_token>
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<db_password>
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=crypto_repos
```

## Critical Dependencies and Usage

### Active Usage

1. Repository Data Collection

   - Fetches repository metadata
   - Updates at regular intervals
   - Stores historical data

2. Language Analysis

   - Tracks primary languages
   - Maintains language statistics
   - Updates on repository changes

3. Contributor Tracking
   - Monitors contributor activity
   - Stores contributor metadata
   - Tracks contribution counts

### System Dependencies

1. Database Requirements

   - PostgreSQL instance
   - Required tables and schema
   - Sufficient storage capacity

2. API Requirements

   - Valid GitHub API token
   - Rate limit compliance
   - Error handling

3. File System
   - Cache directory access
   - Ecosystem file access
   - Log file writing permissions

## Removal Considerations

### Before Deletion

1. Data Backup

   ```sql
   pg_dump -t repositories -t repository_contributors -t repository_topics crypto_repos > github_data_backup.sql
   ```

2. Service Dependencies

   - Check for services consuming repository data
   - Update or remove dependent services
   - Handle cached data cleanup

3. System Updates
   - Remove scheduled tasks
   - Update configuration files
   - Clean up environment variables

### Impact Assessment

1. Data Loss

   - Repository metadata
   - Contributor information
   - Language statistics
   - Historical tracking

2. Service Disruption

   - Repository tracking
   - Language analysis
   - Contributor monitoring

3. System Integration
   - Database connections
   - API integrations
   - File system usage

## Recommendations

### Pre-Deletion Steps

1. Backup all database tables
2. Archive ecosystem files
3. Document API dependencies
4. Remove scheduled tasks
5. Clean up environment variables

### Post-Deletion Tasks

1. Update documentation
2. Remove database tables
3. Clean up cache directory
4. Update configuration files
5. Remove API tokens

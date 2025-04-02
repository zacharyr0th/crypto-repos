#!/usr/bin/env ts-node
/**
 * TypeScript version of hasura.sh
 * Manages Hasura Docker container
 */
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Color codes for console output
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const NC = '\x1b[0m'; // No Color

function log(message: string, color = NC): void {
  console.log(`${color}${message}${NC}`);
}

// Paths
const HASURA_DIR = path.join(process.cwd(), 'hasura');
const ENV_FILE = path.join(process.cwd(), '.env.local');

/**
 * Check if Docker is running
 */
function isDockerRunning(): boolean {
  try {
    const result = spawnSync('docker', ['info'], { stdio: 'ignore' });
    return result.status === 0;
  } catch (error) {
    return false;
  }
}

/**
 * Load environment variables from .env.local
 */
function loadEnvVars(): boolean {
  if (!fs.existsSync(ENV_FILE)) {
    log(`Error: .env.local file not found. Please create it first.`, RED);
    return false;
  }

  dotenv.config({ path: ENV_FILE });
  return true;
}

/**
 * Show Hasura container status
 */
function showStatus(): void {
  try {
    const result = spawnSync(
      'docker',
      ['ps', '--filter', 'name=hasura-graphql-engine', '--format', '{{.Status}}'],
      {
        encoding: 'utf8',
      }
    );

    if (result.stdout.trim()) {
      log(`Hasura is running`, GREEN);
      log(`Console URL: http://localhost:8080/console`);
    } else {
      log(`Hasura is not running`, YELLOW);
    }
  } catch (error) {
    log(`Error checking Hasura status: ${error}`, RED);
  }
}

/**
 * Main function to manage Hasura container
 */
async function manageHasura(command: string): Promise<void> {
  // Check if Docker is running
  if (!isDockerRunning()) {
    log(`Error: Docker is not running. Please start Docker first.`, RED);
    process.exit(1);
  }

  // Load environment variables
  if (!loadEnvVars()) {
    process.exit(1);
  }

  try {
    switch (command) {
      case 'start':
        log(`Starting Hasura...`, GREEN);
        spawnSync('docker', ['compose', 'up', '-d'], {
          cwd: HASURA_DIR,
          stdio: 'inherit',
        });
        showStatus();
        break;

      case 'stop':
        log(`Stopping Hasura...`, YELLOW);
        spawnSync('docker', ['compose', 'down'], {
          cwd: HASURA_DIR,
          stdio: 'inherit',
        });
        break;

      case 'restart':
        log(`Restarting Hasura...`, YELLOW);
        spawnSync('docker', ['compose', 'down'], {
          cwd: HASURA_DIR,
          stdio: 'inherit',
        });
        spawnSync('docker', ['compose', 'up', '-d'], {
          cwd: HASURA_DIR,
          stdio: 'inherit',
        });
        showStatus();
        break;

      case 'logs':
        log(`Showing Hasura logs...`, GREEN);
        spawnSync('docker', ['compose', 'logs', '-f'], {
          cwd: HASURA_DIR,
          stdio: 'inherit',
        });
        break;

      case 'status':
        showStatus();
        break;

      default:
        log(`Usage: npm run hasura -- [start|stop|restart|logs|status]`, YELLOW);
        process.exit(1);
    }
  } catch (error) {
    log(`Error: ${error}`, RED);
    process.exit(1);
  }
}

// Run the script if executed directly
if (require.main === module) {
  const command = process.argv[2] || 'status';
  manageHasura(command).catch((error) => {
    log(`Error: ${error}`, RED);
    process.exit(1);
  });
}

export { manageHasura };

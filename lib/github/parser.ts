import fs from 'fs';
import path from 'path';
import toml from 'toml';
import readline from 'readline';

interface TomlRepository {
  url: string;
}

export async function parseEcosystemFile(ecosystem: string): Promise<string[]> {
  try {
    const filePath = path.join(process.cwd(), 'lib/db/ecosystems', `${ecosystem}.toml`);

    // Use readline interface to process the file line by line
    const urls: string[] = [];
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    let currentUrl = '';

    for await (const line of rl) {
      // Skip comments and empty lines
      if (line.trim().startsWith('#') || !line.trim()) continue;

      // Look for URL lines
      if (line.includes('url =')) {
        const match = line.match(/url\s*=\s*"([^"]+)"/);
        if (match && match[1].includes('github.com')) {
          urls.push(match[1]);
        }
      }
    }

    return urls;
  } catch (error) {
    return [];
  }
}

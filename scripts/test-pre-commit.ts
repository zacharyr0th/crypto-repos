import { exec } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Colors for output
const COLORS = {
  RED: '\x1b[0;31m',
  GREEN: '\x1b[0;32m',
  YELLOW: '\x1b[1;33m',
  NC: '\x1b[0m', // No Color
} as const;

// Test files configuration
const TEST_FILES = [
  'api_key.txt',
  'secret.txt',
  'aws.config',
  'db.config',
  '.env',
  'key.txt',
] as const;

interface TestFile {
  filename: string;
  content: string;
}

class PreCommitTester {
  private repoRoot: string;
  private fixturesDir: string;
  private testResults = {
    passed: 0,
    failed: 0,
  };

  constructor() {
    this.repoRoot = '';
    this.fixturesDir = '';
  }

  private log(message: string, color: keyof typeof COLORS = 'NC'): void {
    console.log(`${COLORS[color]}${message}${COLORS.NC}`);
  }

  private async getRepoRoot(): Promise<string> {
    try {
      const { stdout } = await execAsync('git rev-parse --show-toplevel');
      return stdout.trim();
    } catch {
      return path.dirname(path.dirname(__dirname));
    }
  }

  private async setupTestFixtures(): Promise<void> {
    this.log('🧪 Setting up test fixtures...', 'YELLOW');

    const timestamp = Date.now();
    this.fixturesDir = path.join(this.repoRoot, 'logs', 'test-fixtures', `pre-commit-${timestamp}`);

    await fs.mkdir(this.fixturesDir, { recursive: true });
    await fs.chmod(this.fixturesDir, 0o700);

    const testFiles: TestFile[] = [
      {
        filename: 'api_key.txt',
        content: "API_KEY='sk_live_1234567890abcdef1234567890abcdef'", // Stripe-like key
      },

      {
        filename: 'secret.txt',
        content: "SECRET='ghp_1234567890abcdef1234567890abcdef12'", // GitHub token
      },

      {
        filename: 'aws.config',
        content:
          "AWS_ACCESS_KEY_ID='AKIAIOSFODNN7EXAMPLE'\nAWS_SECRET_ACCESS_KEY='wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'",
      },

      {
        filename: 'db.config',
        content: 'mongodb+srv://username:password123@cluster0.mongodb.net/database',
      },

      {
        filename: '.env',
        content:
          'DATABASE_PASSWORD=super_secure_password_123\nJWT_SECRET=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
      },

      {
        filename: 'key.txt',
        content:
          '-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEAwUDnWEGpyFWz6yoGZPSXn4cVH3Zw/8\n-----END RSA PRIVATE KEY-----',
      },

      {
        filename: 'valid.txt',
        content: 'This is perfectly fine content with no secrets',
      },
    ];

    for (const file of testFiles) {
      const filePath = path.join(this.fixturesDir, file.filename);
      await fs.writeFile(filePath, file.content);
      await fs.chmod(filePath, file.filename === 'valid.txt' ? 0o644 : 0o600);
    }

    this.log('Test fixtures created successfully', 'GREEN');
    const { stdout } = await execAsync(`ls -la "${this.fixturesDir}"`);
    console.log(stdout);
  }

  private async setupTestRepo(): Promise<string> {
    const testDir = await fs.mkdtemp(path.join(this.repoRoot, 'logs', 'test-'));
    await fs.chmod(testDir, 0o700);

    this.log(`Setting up test repository in: ${testDir}`, 'YELLOW');

    // Initialize git repo
    await execAsync(`
            cd "${testDir}" &&
            git init &&
            git config --local user.email "test@example.com" &&
            git config --local user.name "Test User" &&
            touch README.md &&
            git add README.md &&
            git commit -m "Initial commit"
        `);

    // Create pre-commit hook
    const hookDir = path.join(testDir, '.git', 'hooks');
    await fs.mkdir(hookDir, { recursive: true });

    const preCommitContent = `#!/bin/bash

# Exit on any error
set -e

echo "🔒 Running security checks..."

# Enable debugging only when requested
if [[ "\${DEBUG:-false}" == "true" ]]; then
    set -x
fi

# Function to check for high entropy strings
check_entropy() {
    local content="\$1"
    local file="\$2"
    local high_entropy_pattern='[0-9a-f]{32}|[0-9a-f]{40}|[A-Za-z0-9+/]{64}|[A-Za-z0-9+/]{88}'
    
    if echo "\$content" | grep -Ei "\$high_entropy_pattern" > /dev/null 2>&1; then
        echo "⚠️ High entropy strings detected in \$file - possible credentials"
        return 1
    fi
    return 0
}

# Function to check for potential secrets with more precise patterns
check_secrets() {
    local file="\$1"
    local staged_content
    
    # Get staged content once for efficiency
    staged_content=\$(git show ":\$file" 2>/dev/null || cat "\$file")
    
    # Check for private keys first
    if echo "\$staged_content" | grep -q "BEGIN.*PRIVATE KEY"; then
        echo "❌ Potential private key found in \$file"
        return 1
    fi

    # More precise patterns with better matching
    local patterns=(
        "api[_-]key[=\"'][^\"']{16,}[\"']"
        "secret[=\"'][^\"']{16,}[\"']"
        "password[=\"'][^\"']{8,}[\"']"
        "aws[_-]access[_-]key[_-]id[=\"'][A-Z0-9]{20}[\"']"
        "aws[_-]secret[_-]access[_-]key[=\"'][0-9a-zA-Z/+]{40}[\"']"
        "private[_-]key[=\"'][^\"']{16,}[\"']"
        "[a-zA-Z0-9_-]*token[=\"'][^\"']{16,}[\"']"
        "mongodb[+]srv://[^\"']*[^\"']*"
        "postgres://[^\"']*:[^\"']*@[^\"']*"
        "mysql://[^\"']*:[^\"']*@[^\"']*"
        "redis://[^\"']*:[^\"']*@[^\"']*"
        "ssh-rsa [A-Za-z0-9+/]+[=]{0,2}"
        "ey[A-Za-z0-9_-]{20,}"  # JWT pattern
        "gh[ps]_[A-Za-z0-9_]{36,}"  # GitHub token pattern
        "sk_live_[0-9a-zA-Z]{24,}"  # Stripe key pattern
    )
    
    # Check entropy for possible tokens
    if ! check_entropy "\$staged_content" "\$file"; then
        return 1
    fi
    
    for pattern in "\${patterns[@]}"; do
        if echo "\$staged_content" | grep -Ei "\$pattern" > /dev/null 2>&1; then
            echo "❌ Potential secret found in \$file matching pattern: \$pattern"
            return 1
        fi
    done
    return 0
}

# More comprehensive check for sensitive files
check_sensitive_files() {
    local files
    files=\$(git diff --cached --name-only | grep -iE '\.(env|pem|key|p12|pfx|keystore|jks|cert|crt|cer|der|p7b|p7c|csr|pub|gpg|asc|ovpn|ppk|id_rsa|id_dsa|config|ini|conf|cfg|json|yaml|yml)$' || true)
    
    if [ -n "\$files" ]; then
        # Exclude example/template files
        if echo "\$files" | grep -ivE '\.(example|sample|template|dist)$' > /dev/null; then
            echo "⚠️ Attempting to commit potentially sensitive files:"
            echo "\$files" | grep -ivE '\.(example|sample|template|dist)$'
            return 1
        fi
    fi
    return 0
}

# Get list of staged files
staged_files=\$(git diff --cached --name-only)

# Exit early if no files are staged
if [ -z "\$staged_files" ]; then
    echo "No files staged for commit"
    exit 0
fi

exit_code=0

# Create temporary directory for binary file analysis
temp_dir=\$(mktemp -d)
trap 'rm -rf "\$temp_dir"' EXIT

# Check each staged file
for file in \$staged_files; do
    # Skip if file doesn't exist
    if [[ ! -f "\$file" ]]; then
        continue
    fi
    
    # Skip example/template files
    if [[ "\$file" =~ \.(example|sample|template|dist)$ ]]; then
        continue
    fi
    
    # Check text files for secrets
    if file "\$file" | grep -qi "text\\|ascii\\|utf-8\\|empty"; then
        if ! check_secrets "\$file"; then
            exit_code=1
        fi
    # Basic check for binary files
    elif file "\$file" | grep -qi "executable\\|binary"; then
        echo "⚠️ Checking binary file: \$file"
        # Extract strings and check for secrets
        strings "\$file" > "\$temp_dir/binary_strings"
        if ! check_secrets "\$temp_dir/binary_strings"; then
            exit_code=1
        fi
    fi
done

# Check for sensitive files
if ! check_sensitive_files; then
    exit_code=1
fi

if [ \$exit_code -eq 1 ]; then
    echo "❌ Commit blocked: Sensitive data detected"
    echo "Please remove sensitive data and try committing again"
    echo "If this is a false positive, you can bypass with: git commit --no-verify"
    exit 1
fi

echo "✅ Security checks passed"
exit 0`;

    await fs.writeFile(path.join(hookDir, 'pre-commit'), preCommitContent);
    await fs.chmod(path.join(hookDir, 'pre-commit'), 0o755);

    return testDir;
  }

  private async runTest(
    file: string,
    expectedResult: 'should_fail' | 'should_pass',
    testName: string
  ): Promise<void> {
    this.log(`\nRunning test: ${testName}`, 'YELLOW');

    const testDir = await this.setupTestRepo();
    const testFile = path.join(testDir, file);

    // Create test file
    const fileContent = TEST_FILES.includes(file as (typeof TEST_FILES)[number])
      ? await fs.readFile(path.join(this.fixturesDir, file), 'utf8')
      : 'This is perfectly fine content';

    await fs.writeFile(testFile, fileContent);

    try {
      await execAsync(`cd "${testDir}" && git add "${file}"`);

      // Add debugging for key.txt
      if (file === 'key.txt') {
        this.log('\nDebugging key.txt:', 'YELLOW');
        const content = await fs.readFile(testFile, 'utf8');
        this.log('File content:', 'YELLOW');
        console.log(content);
        const { stdout: gitShow } = await execAsync(`cd "${testDir}" && git show :key.txt || true`);
        this.log('Git show output:', 'YELLOW');
        console.log(gitShow);
      }

      await execAsync(`cd "${testDir}" && git commit -m "test commit"`);

      if (expectedResult === 'should_fail') {
        this.log(`❌ FAILED: ${testName}`, 'RED');
        this.log('Commit succeeded when it should have failed', 'RED');
        this.testResults.failed++;
      } else {
        this.log(`✅ PASSED: ${testName}`, 'GREEN');
        this.testResults.passed++;
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (expectedResult === 'should_fail') {
        this.log(`✅ PASSED: ${testName}`, 'GREEN');
        this.log('Commit blocked as expected with output:', 'YELLOW');
        console.log(errorMessage);
        this.testResults.passed++;
      } else {
        this.log(`❌ FAILED: ${testName}`, 'RED');
        this.log('Commit failed when it should have succeeded', 'RED');
        this.log('Commit output:', 'YELLOW');
        console.log(errorMessage);
        this.testResults.failed++;
      }
    }

    // Cleanup
    await fs.rm(testDir, { recursive: true, force: true });
  }

  async run(): Promise<void> {
    try {
      this.log('🧪 Testing pre-commit hook...\n', 'YELLOW');

      this.repoRoot = await this.getRepoRoot();
      await this.setupTestFixtures();

      // Run tests for each case
      for (const testFile of TEST_FILES) {
        await this.runTest(testFile, 'should_fail', `Testing ${testFile} with sensitive data`);
      }

      // Test valid file
      await this.runTest('valid.txt', 'should_pass', 'Testing valid content');

      // Summary
      this.log('\nTest Summary:', 'YELLOW');
      this.log(`Passed: ${this.testResults.passed}`, 'GREEN');
      this.log(`Failed: ${this.testResults.failed}`, 'RED');

      if (this.testResults.failed === 0) {
        this.log('\n✅ All tests passed!', 'GREEN');
        process.exit(0);
      } else {
        this.log('\n❌ Some tests failed', 'RED');
        process.exit(1);
      }
    } finally {
      // Cleanup fixtures
      if (this.fixturesDir) {
        await fs.rm(this.fixturesDir, { recursive: true, force: true });
      }
    }
  }
}

// Run tests
if (require.main === module) {
  const tester = new PreCommitTester();
  tester.run().catch((error) => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}
// Test comment
// Another test comment

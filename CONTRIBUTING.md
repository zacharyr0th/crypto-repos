# Contributing to Crypto Repos

Thank you for your interest in contributing to Crypto Repos! This document provides guidelines and instructions for contributing.

## Getting Started

1. **Fork the Repository**

   ```bash
   git clone https://github.com/YOUR_USERNAME/crypto-repos.git
   cd crypto-repos
   ```

2. **Install Dependencies**

   ```bash
   pnpm install
   ```

3. **Set Up Environment**

   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` with your configuration

4. **Start Development Server**
   ```bash
   pnpm dev
   ```

## Development Guidelines

### Code Style

- Use TypeScript for all new code
- Follow existing code formatting (Prettier)
- Write meaningful commit messages
- Add comments for complex logic
- Keep functions small and focused

### Pull Request Process

1. Create a new branch for your feature

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes and commit

   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

3. Push to your fork

   ```bash
   git push origin feature/your-feature-name
   ```

4. Create a Pull Request

### Commit Message Format

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `style:` Formatting
- `refactor:` Code restructuring
- `test:` Tests
- `chore:` Maintenance

### Testing

- Write tests for new features
- Ensure existing tests pass
- Run `pnpm test` before submitting PR

### Security

- Follow security best practices
- Never commit sensitive data
- Report security issues privately
- See SECURITY.md for details

## Need Help?

- Create an issue for bugs
- Discuss major changes in issues first
- Read our documentation
- Join our community discussions

## License

By contributing, you agree that your contributions will be licensed under the project's license.

Thank you for contributing to Crypto Repos!

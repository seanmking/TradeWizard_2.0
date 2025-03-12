# Contributing to TradeWizard 2.0

Thank you for considering contributing to TradeWizard! This document outlines the process for contributing to the project and the standards we expect.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for everyone.

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Git
- Docker (for local development)
- Supabase account

### Development Environment Setup

1. Fork the repository on GitHub
2. Clone your forked repository:
   ```bash
   git clone https://github.com/your-username/tradewizard.git
   cd tradewizard
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Set up environment variables:
   ```bash
   cp tradewizard/.env.example tradewizard/.env.local
   cp backend/.env.example backend/.env
   ```
5. Start the development servers:
   ```bash
   # For frontend
   npm run frontend:dev
   
   # For backend
   npm run backend:dev
   ```

## Development Workflow

1. Create a new branch for your feature or bugfix:
   ```bash
   git checkout -b feature/your-feature-name
   ```
   or
   ```bash
   git checkout -b fix/issue-you-are-fixing
   ```

2. Make your changes, following the coding standards (see below)

3. Run tests to ensure your changes don't break existing functionality:
   ```bash
   npm test
   ```

4. Commit your changes following the commit message guidelines:
   ```bash
   git commit -m "feat: add new feature" 
   ```

5. Push your branch to GitHub:
   ```bash
   git push origin feature/your-feature-name
   ```

6. Create a pull request against the main repository

## Coding Standards

Please follow these coding standards when contributing:

### General

- Use 2 spaces for indentation
- Max line length: 100 characters
- Use semicolons in JavaScript/TypeScript
- Use single quotes for strings
- Always use curly braces for control statements
- Trailing commas in multiline objects and arrays

### Naming Conventions

- React components: PascalCase (e.g., ExportReadinessScore)
- Functions and variables: camelCase (e.g., fetchComplianceData)
- Constants: UPPER_CASE (e.g., API_ENDPOINT)
- Files: kebab-case (e.g., export-readiness-component.tsx)
- Database tables: snake_case (e.g., user_profiles)

### Directory Structure

- Follow the established project structure
- Group files by feature rather than by type
- Keep related files close to each other

## Commit Message Format

Follow the conventional commits specification:

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, missing semicolons, etc.)
- `refactor`: Code changes that neither fix bugs nor add features
- `perf`: Performance improvements
- `test`: Adding or modifying tests
- `chore`: Changes to the build process or auxiliary tools

## Pull Request Process

1. Ensure all automated tests pass
2. Update documentation if necessary
3. Add a clear description of the changes
4. Reference any relevant issues
5. Ensure your PR has been reviewed by at least one maintainer

## Release Process

The project maintainers will handle the release process following these steps:

1. Version bumping
2. Changelog updates
3. Release notes
4. Deployment to production

## Questions?

If you have any questions or need help, please reach out to the maintainers or open an issue for discussion.

Thank you for contributing to TradeWizard! 
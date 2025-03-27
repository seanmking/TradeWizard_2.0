# Security Policy

## Supported Versions

We currently support the following versions of TradeWizard with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 2.0.x   | :white_check_mark: |
| 1.x.x   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability in TradeWizard, please follow these steps:

1. **Do not disclose the vulnerability publicly** until it has been addressed by our team.
2. Email your findings to security@yourdomain.com.
3. Include as much information as possible about the vulnerability, including:
   - A clear description of the issue
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if you have one)

Our security team will acknowledge your report within 48 hours and will provide a more detailed response within 72 hours, indicating the next steps in handling your submission.

## Security Update Process

We follow these steps when addressing security vulnerabilities:

1. **Verification**: Our team verifies the vulnerability and determines its impact.
2. **Fix Development**: A fix is developed and tested.
3. **Release Planning**: We prioritize security fixes and release them as quickly as possible.
4. **Notification**: Users are notified through our release notes and security advisories.

## Recent Security Updates

### March 27, 2025

Updates to address multiple vulnerabilities:

- **Frontend Dependencies**:
  - Updated @headlessui/react to v2.2.1
  - Updated @supabase/supabase-js to v2.39.3
  - Updated axios to v1.9.0
  - Updated dotenv to v16.4.5
  - Updated lucide-react to v0.499.0
  - Updated openai to v4.171.0
  - Updated recharts to v2.12.0
  - Updated react-intersection-observer to v9.8.1

- **Backend Dependencies**:
  - Updated @nestjs/* packages to v11.5.0
  - Updated @prisma/client to v5.10.2
  - Updated ioredis to v5.6.2
  - Updated socket.io to v4.8.2
  - Updated axios to v1.9.0
  - Updated prisma to v5.10.2
  - Updated @types/puppeteer to v7.0.4

## Security Best Practices for Development

1. Keep all dependencies up-to-date
2. Run `npm audit` regularly
3. Use GitHub's Dependabot to automate security updates
4. Follow secure coding practices
5. Implement proper authentication and authorization
6. Use environment variables for sensitive information
7. Never commit secrets or credentials to the repository

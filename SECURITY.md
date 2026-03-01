# Security Policy

## Supported Versions

Only the latest release of compliance-mapper receives security fixes.

| Version | Supported |
|---------|-----------|
| latest  | ✅        |
| older   | ❌        |

## Reporting a Vulnerability

If you discover a security vulnerability, **please do not open a public GitHub issue**.

Instead, report it privately by emailing the maintainer or using [GitHub's private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing/privately-reporting-a-security-vulnerability) feature for this repository.

Please include:
- A description of the vulnerability and its potential impact
- Steps to reproduce the issue
- Any relevant logs, screenshots, or proof-of-concept code

You can expect an acknowledgement within **72 hours** and a resolution timeline after triage.

## Security Considerations

- All API endpoints enforce rate limiting (via `express-rate-limit`) to mitigate abuse.
- Framework and mapping data are served from static JSON files; user accounts and progress data are stored in PostgreSQL.
- Passwords are hashed with bcrypt before storage; plain-text passwords are never persisted.
- Authentication uses short-lived JWTs signed with a secret you control (`JWT_SECRET`).
- Sensitive configuration (`DB_PASSWORD`, `JWT_SECRET`, etc.) is managed via environment variables — never commit a populated `.env` file.
- The Docker image runs as a non-root user to limit the blast radius of any container escape.
- Keep Node.js and all npm dependencies up to date to receive upstream security patches.

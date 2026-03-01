# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-03-01

### Added

- Initial release of compliance-mapper
- Support for six compliance frameworks: ISO 27001, NIS2, GDPR, DORA, CIS Controls, and NIST CSF
- REST API for browsing frameworks, controls, and cross-framework mappings
- Mapping relationship types: `equivalent`, `subset`, `superset`, and `related`
- Theme-based filtering and summary statistics endpoint (`/api/themes`, `/api/stats`)
- User account system (register / login) backed by PostgreSQL with bcrypt password hashing and JWT authentication
- Per-control progress tracking with status values `not_started`, `in_progress`, and `completed` and optional notes
- Dark-mode UI built with Tailwind CSS and vanilla JavaScript
- Built-in API documentation page at `/api-docs`
- Docker Compose setup (app + PostgreSQL) with health checks and non-root container user
- Standalone mode (`STANDALONE_MODE=true`) for running without a database
- API key enforcement via `API_KEYS` environment variable
- Rate limiting on all endpoints via `express-rate-limit`
- `.env.example` with fully documented environment variables

[Unreleased]: https://github.com/veniplex/compliance-mapper/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/veniplex/compliance-mapper/releases/tag/v1.0.0

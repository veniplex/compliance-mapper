# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.0.0-beta] - 2026-03-02

### Changed

- **Migrated frontend to SvelteKit 2 (Svelte 5.53.6)** — replaced vanilla JS SPA with proper SvelteKit routing and server-side API routes
- **Upgraded to Tailwind CSS v4.2** — CSS-first configuration via `@import "tailwindcss"` in `src/app.css`, no more `tailwind.config.js`
- **Replaced Express with SvelteKit server routes** — all API endpoints (`/api/…`) are now implemented as `+server.js` files under `src/routes/api/`
- **Replaced `node server.js` with `node build/index.js`** — built output from `@sveltejs/adapter-node`
- **Updated tests** — converted to ES modules (import syntax); tests now import from the built `build/handler.js` instead of the old Express app

### Added

- **Reusable Svelte components**: `NavBar`, `FrameworkCard`, `FwBadge`, `RelPill`, `ProgressBadge`, `Modal`, `AuthModal`, `DonutChart`
- **SvelteKit pages**: frameworks grid, framework detail (`/frameworks/[id]`), controls table (`/controls`), API docs (`/api-docs`), dashboard (`/dashboard`), settings (`/settings`)
- **Settings API**: profile, password change, API key management endpoints
- **Hooks server** (`src/hooks.server.js`): CORS headers on all responses, JSON error format (`{ error }`) for API routes
- **Progress dashboard** with per-framework progress bars and overall compliance score (donut chart)
- **Dark mode toggle** in the navigation bar

### Removed

- Express.js, express-rate-limit, cors, helmet, and nodemon dependencies
- Old `server.js`, `db.js`, `middleware/`, `routes/` Express application files
- `public/` directory (vanilla JS frontend replaced by SvelteKit)
- `tailwind.config.js` (Tailwind v3 configuration)
- `build:css` npm script

## [1.0.0-beta] - 2026-03-01

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

[Unreleased]: https://github.com/veniplex/compliance-mapper/compare/v2.0.0-beta...HEAD
[2.0.0-beta]: https://github.com/veniplex/compliance-mapper/compare/v1.0.0-beta...v2.0.0-beta
[1.0.0-beta]: https://github.com/veniplex/compliance-mapper/releases/tag/v1.0.0-beta

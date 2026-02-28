# Contributing to compliance-mapper

Thank you for your interest in contributing! This guide explains how to get set up, what kinds of contributions are welcome, and how to submit your changes.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Running Tests](#running-tests)
- [How to Contribute](#how-to-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Features](#suggesting-features)
  - [Adding or Updating Data](#adding-or-updating-data)
  - [Code Contributions](#code-contributions)
- [Pull Request Process](#pull-request-process)
- [Code Style](#code-style)
- [Security Issues](#security-issues)
- [License](#license)

---

## Code of Conduct

Please be respectful and constructive in all interactions. Harassment or abusive behaviour of any kind will not be tolerated.

---

## Getting Started

1. **Fork** the repository and clone your fork:
   ```bash
   git clone https://github.com/<your-username>/compliance-mapper.git
   cd compliance-mapper
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables** (optional):
   ```bash
   cp .env.example .env
   # Edit .env to set PORT or API_KEYS as needed
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:3000` and will auto-reload on file changes.

---

## Running Tests

```bash
npm test
```

All tests must pass before a pull request will be merged. Please add or update tests whenever you change server-side behaviour.

---

## How to Contribute

### Reporting Bugs

1. Search [existing issues](https://github.com/veniplex/compliance-mapper/issues) to avoid duplicates.
2. Open a new issue and include:
   - A clear, descriptive title
   - Steps to reproduce the problem
   - Expected vs. actual behaviour
   - Your Node.js version (`node --version`) and operating system

### Suggesting Features

Open an issue with the label **enhancement** and describe:
- The problem you are trying to solve
- Your proposed solution or API change
- Any alternatives you considered

### Adding or Updating Data

Compliance framework data lives in the `data/` directory:

| File | Contents |
|------|----------|
| `data/frameworks.json` | Framework metadata (id, name, description, version) |
| `data/controls.json` | Individual controls with themes and descriptions |
| `data/mappings.json` | Relationships between controls across frameworks |

**Guidelines for data changes:**

- Use the existing JSON structure and field naming conventions.
- Every `control` entry must reference a valid `frameworkId` that exists in `frameworks.json`.
- Every `mapping` entry must reference valid control IDs from `controls.json`.
- Valid `relationship` values are: `equivalent`, `subset`, `superset`, and `related`.
- Cite the source of any new framework data (version, publication date, official URL) in the framework's `description` field or in the pull request description.
- Keep control IDs short, stable, and unique (e.g. `iso27001-a.5.1`).

### Code Contributions

- **Bug fixes** – reference the issue number in your branch name (e.g. `fix/123-rate-limit-header`).
- **New features** – open an issue first so the approach can be agreed on before you invest time coding.
- Keep each pull request focused on a single concern.

---

## Pull Request Process

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feat/my-change
   ```
2. Make your changes and commit with a clear, descriptive message.
3. Ensure `npm test` passes locally.
4. Push your branch and open a pull request against `main`.
5. Fill in the pull request template (if present) and describe *what* changed and *why*.
6. A maintainer will review your PR. Please respond to feedback promptly.
7. Once approved, the maintainer will merge it.

---

## Code Style

- Use **2-space indentation** and keep lines under **120 characters** where possible.
- Follow the patterns already established in `server.js` (e.g. route organisation, error handling, middleware order).
- Do not commit a populated `.env` file — only `.env.example` should be tracked.
- Keep dependencies minimal; discuss adding new packages in the issue before including them in a PR.

---

## Security Issues

Please **do not** open a public issue for security vulnerabilities. Follow the process described in [SECURITY.md](SECURITY.md).

---

## License

By contributing, you agree that your contributions will be licensed under the same [Non-Commercial Use License](LICENSE) as the rest of the project.

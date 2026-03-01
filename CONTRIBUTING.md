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

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating you are expected to uphold this code. Please report unacceptable behaviour via [GitHub's private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing/privately-reporting-a-security-vulnerability).

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

Data-only contributions (new frameworks, controls, or mappings) **do not require you to run the server or write any code**. You only need a text editor and Git. The workflow below is all you need.

#### Quick-start workflow

1. Fork and clone the repository (see [Getting Started](#getting-started)).
2. Create a branch with the `data/` prefix:
   ```bash
   git checkout -b data/add-nist-csf-2
   ```
3. Edit the JSON files described below.
4. Validate your JSON (any JSON linter or `node -e "JSON.parse(require('fs').readFileSync('data/frameworks.json','utf8'))"` for each file).
5. Open a pull request against `main`. Use the **Data contribution** issue / PR template and cite your source.

> **No Node.js setup required for pure data changes.** You can even edit the files directly in the GitHub web UI and open a PR from there.

---

#### File reference

Compliance framework data lives in the `data/` directory:

| File | Contents |
|------|----------|
| `data/frameworks.json` | Framework metadata (array of framework objects) |
| `data/controls.json` | Individual controls, grouped by `frameworkId` (object keyed by framework id) |
| `data/mappings.json` | Relationships between controls across frameworks (array of mapping objects) |

---

#### Schema: `data/frameworks.json`

Each entry in the top-level array describes one framework:

```json
{
  "id": "nistcsf2",
  "name": "NIST Cybersecurity Framework 2.0",
  "shortName": "NIST CSF 2.0",
  "description": "...",
  "version": "2.0",
  "lastUpdated": "2024-02-26",
  "region": "United States",
  "type": "Framework",
  "url": "https://www.nist.gov/cyberframework",
  "color": "#16a34a",
  "businessImpact": ["...", "..."],
  "structure": ["...", "..."]
}
```

| Field | Required | Notes |
|-------|----------|-------|
| `id` | ✅ | Short, lowercase, unique across all frameworks (e.g. `nistcsf2`). Used as the key in `controls.json` and referenced by mappings — **never change it after merging**. |
| `name` | ✅ | Full official name. |
| `shortName` | ✅ | Abbreviated name shown in the UI. |
| `description` | ✅ | One or two sentences. Include the official publication date and URL. |
| `version` | ✅ | Official version string (e.g. `"2.0"`, `"2022/2555"`). |
| `lastUpdated` | ✅ | ISO 8601 date of the official publication (`YYYY-MM-DD`). |
| `region` | ✅ | Jurisdiction (e.g. `"International"`, `"European Union"`, `"United States"`). |
| `type` | ✅ | One of: `Standard`, `Regulation`, `Framework`, `Guideline`. |
| `url` | ✅ | Canonical URL to the official publication. |
| `color` | ✅ | Tailwind-compatible hex colour used in the UI badge (e.g. `"#16a34a"`). |
| `businessImpact` | ✅ | Array of strings — each string is one bullet point shown in the framework detail view. |
| `structure` | ✅ | Array of strings — brief structural description bullets. |

---

#### Schema: `data/controls.json`

The file is a **JSON object** keyed by `frameworkId`. Each value is an array of control objects:

```json
{
  "nistcsf2": [
    {
      "id": "nistcsf2-GV.OC-01",
      "ref": "GV.OC-01",
      "title": "Organizational mission is understood...",
      "description": "The organizational mission is understood and informs cybersecurity risk management.",
      "category": "Organizational Context",
      "theme": "Governance",
      "frameworkId": "nistcsf2"
    }
  ]
}
```

| Field | Required | Notes |
|-------|----------|-------|
| `id` | ✅ | Globally unique. Convention: `<frameworkId>-<ref>` with spaces replaced by `-` (e.g. `nistcsf2-GV.OC-01`). Preserve the original casing of the `ref` portion. **Never change after merging.** |
| `ref` | ✅ | Official control reference as it appears in the source document. |
| `title` | ✅ | Short title of the control. |
| `description` | ✅ | One or two sentence description from the source. |
| `category` | ✅ | The section or category within the framework (e.g. `"Organizational Context"`). |
| `theme` | ✅ | High-level theme used for cross-framework filtering. Reuse an existing theme where possible: `Governance`, `Risk Management`, `Access Control`, `Incident Management`, `Business Continuity`, `Supply Chain`, `Data Protection`, `Compliance`. |
| `frameworkId` | ✅ | Must exactly match the `id` of a framework in `frameworks.json` and the key under which this array appears. |

---

#### Schema: `data/mappings.json`

Each entry in the top-level array links two controls:

```json
{
  "id": "map-999",
  "sourceControlId": "nistcsf2-GV.OC-01",
  "targetControlId": "iso27001-5.1",
  "relationship": "related",
  "notes": "Both address the alignment of security objectives with organisational strategy."
}
```

| Field | Required | Notes |
|-------|----------|-------|
| `id` | ✅ | Unique string. Use sequential `map-NNN` format (find the highest existing id and increment). |
| `sourceControlId` | ✅ | Must exactly match a control `id` in `controls.json`. |
| `targetControlId` | ✅ | Must exactly match a control `id` in `controls.json`. |
| `relationship` | ✅ | One of: `equivalent` (controls cover the same requirement), `subset` (source is narrower than target), `superset` (source is broader than target), `related` (related but not directly equivalent). |
| `notes` | ✅ | One or two sentences explaining the mapping rationale. |

---

#### General guidelines

- **Cite your source.** Include the official version, publication date, and URL in the PR description or the framework's `description` field.
- **Stable IDs.** Control and framework `id` values are referenced by mappings and stored in user progress records. Once merged, treat them as immutable.
- **Reuse themes.** Check existing controls for the theme vocabulary before introducing a new theme value.
- **One framework per PR** keeps reviews manageable.
- **Validate JSON** before opening a PR — an invalid file will break the entire API.

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

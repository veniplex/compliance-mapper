# compliance-mapper

A web app and REST API that helps cybersecurity experts map overlapping controls across compliance frameworks such as ISO 27001, NIS2, GDPR, DORA, CIS Controls, and NIST CSF.

## Features

- Browse supported compliance frameworks and their controls
- Query mappings between controls across different frameworks
- Filter by relationship type (equivalent, subset, related, etc.)
- Dark mode UI built with Tailwind CSS
- Built-in API documentation page

## Tech Stack

- **Backend**: Node.js (>= 18) + Express
- **Frontend**: Vanilla JavaScript, Tailwind CSS
- **Data**: JSON files for frameworks, controls, and mappings

## Getting Started

**Install dependencies:**
```bash
npm install
```

**Start the server:**
```bash
npm start        # production
npm run dev      # development (auto-reload with nodemon)
```

The app is available at `http://localhost:3000` (override with the `PORT` environment variable).

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/frameworks` | List all frameworks |
| GET | `/api/frameworks/:id` | Get a single framework |
| GET | `/api/frameworks/:id/controls` | List controls for a framework |
| GET | `/api/controls` | List controls (optional `?framework=` filter) |
| GET | `/api/controls/:id` | Get a single control |
| GET | `/api/mappings` | Query mappings (`?from=`, `?to=`, `?control=`, `?relationship=`) |
| GET | `/api/themes` | List unique themes across all controls |

## Running Tests

```bash
npm test
```

## License

MIT

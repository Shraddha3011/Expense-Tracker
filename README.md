# Expense Tracker (Technical Assessment Submission)

A minimal full-stack expense tracker built for real-world reliability: retries, refreshes, slow networks, and duplicate submissions.

## Submission Links

- Repository: [https://github.com/Shraddha3011/Expense-Tracker](https://github.com/Shraddha3011/Expense-Tracker)
- Live App (Frontend): `https://expense-tracker-gpugfhh7t-empowerhers-projects.vercel.app/`
- Live API (Backend): `https://expense-tracker-zle5.onrender.com/`

## What This Solves

As a user, I can:
- create an expense with amount, category, description, and date
- view expenses
- filter by category
- sort by date (newest first)
- see total for the currently visible list

## Tech Stack

### Backend
- Node.js + Express
- SQLite (file-based persistence)
- `uuid` for IDs/idempotency keys

### Frontend
- React (CRA) + Hooks
- Axios for API calls
- Retry wrapper with exponential backoff

## Why SQLite for This Assessment

SQLite was chosen because it gives persistent storage with zero external setup, which is ideal for a timeboxed exercise while still behaving like a real backend (not in-memory).

Trade-off: for high-scale production, a managed DB (PostgreSQL/MySQL) would be preferred.

## Reliability and Data Correctness Decisions

### 1) Idempotent creates (`POST /expenses`)
- Client sends `idempotency-key` header.
- Server uses a DB transaction (`BEGIN IMMEDIATE`) to ensure only one expense is created per key.
- Repeated requests with the same key return the original created record.

### 2) Money handling
- Amount is stored as integer cents in DB.
- API returns formatted decimal strings (2 digits).
- This avoids floating-point precision issues for storage/calculation.

### 3) Real-world network behavior
- Frontend retries failed API requests with exponential backoff.
- Loading and error states are shown in UI.
- Submit button is disabled while saving to reduce accidental duplicate clicks.

### 4) Refresh safety
- Data persists in SQLite, so browser refresh after submit still shows saved entries.

## API

Base URL: `http://localhost:5000`

### `POST /expenses`
Create a new expense.

Headers:
- `idempotency-key: <unique-key>`

Body:
```json
{
  "amount": 150.5,
  "category": "Food",
  "description": "Lunch",
  "date": "2026-04-24"
}
```

Success response:
```json
{
  "id": "uuid",
  "amount": "150.50",
  "category": "Food",
  "description": "Lunch",
  "date": "2026-04-24",
  "createdAt": "2026-04-24 12:30:00"
}
```

### `GET /expenses`
List expenses with optional filtering and sorting.

Query params:
- `category=<categoryName>`
- `sortDate=desc|asc` (default `desc`)

Example:
`GET /expenses?category=Food&sortDate=desc`

### `GET /categories/list`
Returns unique categories.

## Validation

Server-side validation:
- amount must be numeric and > 0
- category required
- description required
- date required in `YYYY-MM-DD`

Client-side validation mirrors these checks for better UX.

## Accessibility Improvements

- Form labels linked via `htmlFor`/`id`
- Modal uses `role="dialog"` and `aria-modal="true"`
- Error and success messages use accessible live regions
- Proper button types and accessible close label

## Tests

### Backend
- Integration tests for:
  - create expense
  - idempotency behavior
  - filter by category
  - sort by date

Run:
```bash
cd backend
npm install
npm test
```

### Frontend
- UI tests for:
  - total rendering
  - category filter behavior
  - create expense submit flow
  - error state rendering

Run:
```bash
cd frontend
npm install
npm test -- --watchAll=false
```

## Run Locally

### 1) Backend
```bash
cd backend
npm install
npm start
```
Backend runs at `http://localhost:5000`.

### 2) Frontend
```bash
cd frontend
npm install
npm start
```
If `3000` is occupied, run on another port:
```bash
# PowerShell
$env:PORT=3001; npm start
```

## Project Structure

```text
expense-tracker/
  backend/
    server.js
    expenses.integration.test.js
    validation.test.js
  frontend/
    src/
      App.js
      App.test.js
      api/expenseService.js
  README.md
```

## Timebox Trade-offs

Given time constraints, priority was reliability and correctness of the core flow.

Implemented:
- idempotent create flow
- persistence and API correctness
- robust list/filter/sort/total behavior
- validation + loading/error states
- meaningful backend and frontend tests

Intentionally not implemented:
- authentication/authorization
- edit/delete flows
- pagination
- advanced analytics/reporting
- production infra hardening (rate limiting, auth middleware, observability)

## If I Had More Time

- migrate to PostgreSQL with migrations
- add E2E tests (Playwright/Cypress)
- add edit/delete and richer category reporting
- add CI pipeline with test and lint gates

---

This submission focuses on production-minded behavior under unreliable conditions while keeping the feature scope intentionally small and maintainable.

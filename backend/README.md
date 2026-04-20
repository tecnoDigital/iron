# IronPay Backend (MVP)

Base backend scaffold for IronPay MVP.

## Quick start

1. Copy `.env.example` to `.env`.
2. Install dependencies: `npm install`.
3. Run in dev mode: `npm run dev`.
4. Health check: `GET /health`.

## Scope (Sprint 1)

- Express server baseline
- Env loading and validation
- Logging baseline
- Folder and file structure for core modules

## Scope (Sprint 2)

- Google OAuth login flow (`/auth/google/start`, `/auth/google/callback`)
- Allowlist validation for authorized emails
- Session cookie creation after successful callback
- Auth status and logout endpoints
- Google token persistence in SQLite (`google_tokens`)
- Dedicated encryption key for Google refresh token (`GOOGLE_TOKEN_ENCRYPTION_KEY`)

## Scope (Sprint 3)

- Google auth startup validation (`connected` / `reauth_required` / `no_google_auth`)
- Standardized Google auth state mapping (`NO_GOOGLE_AUTH` / `GOOGLE_CONNECTED` / `REAUTH_REQUIRED`)
- Google status endpoint payload aligned with auth states (`GET /google/status`)

## Scope (Sprint 4)

- Auth audit trail for login accepted/rejected and logout (`audit_logs`)
- Health endpoint explicit operating message for port 3000 (`todo correcto`)
- Sheet validation endpoint with configurable column mapping (`POST /sync/validate`)
- Validation summary for total/valid/invalid/duplicate rows using Google Sheets or mock rows

## Scope (Sprint 5)

- Sync run persistence in SQLite (`sheet_sync_runs`) with latest run query
- Snapshot persistence in SQLite (`snapshots`) with incremental versioning
- Endpoints to execute sync + snapshot and fetch latest state (`POST /sync/run`, `GET /sync/latest`)

## Scope (Sprint 6)

- Campaign creation from latest snapshot with queued call job generation (`POST /campaigns/create`)
- Campaign state transitions for start/pause/resume (`POST /campaigns/:campaignId/start|pause|resume`)
- Campaign lookup endpoints with job state summary (`GET /campaigns/latest`, `GET /campaigns/:campaignId`)

## Scope (Sprint 7)

- Sequential call runner to take one queued job at a time from running campaigns
- Lock + dispatch flow integrated with provider adapter and attempt persistence (`call_attempts`)
- Worker loop tick to execute runner continuously in controlled intervals

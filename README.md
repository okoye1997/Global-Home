# GlobalHome

GlobalHome is a worldwide real estate marketplace built with **Next.js 16, React 19, TypeScript, MongoDB, and Mongoose**. Visitors can browse properties by country, category, and purpose; registered users can save listings and contact the platform administrator. Admins manage inventory, verification, enquiries, and supporting configuration.

**Project status:** active development. The repository includes an isolated academic catalogue for local assessment, but it is not real property inventory. Live email, storage, document scanning, FX sourcing, and full production verification require external configuration and testing. Do not deploy the academic mode or process real investments as though these integrations were complete.

## Contents

- [Quick start](#quick-start)
- [Architecture and features](#architecture-and-features)
- [Environment configuration](#environment-configuration)
- [Database and administrator setup](#database-and-administrator-setup)
- [Inventory workflows](#inventory-workflows)
- [Development commands](#development-commands)
- [Testing and builds](#testing-and-builds)
- [Security and production checklist](#security-and-production-checklist)
- [Further documentation](#further-documentation)

## Quick start

Use a Node.js version supported by the installed Next.js 16 release and npm. The repository uses `package-lock.json`; install exactly those versions with `npm ci`.

```powershell
npm ci
Copy-Item .env.example .env
# Edit .env privately: set MONGODB_URI, MONGODB_DB_NAME, AUTH_SECRET, APP_BASE_URL.
npm run inventory:audit
npm run dev
```

Open **http://localhost:3000/en**. `.env` is ignored by Git; `.env.example` contains only placeholders. Restart the development server after changing environment settings. Use a dedicated development database, and confirm its name with the read-only audit before running any initialization or import command. The audit does not print the MongoDB URI.

## Architecture and features

| Area | Current implementation |
| --- | --- |
| Web | Next.js App Router, server-rendered localized pages, responsive GlobalHome UI |
| API | Route handlers under `src/app/api/`, with server-side validation and authorization |
| Database | MongoDB via Mongoose models, indexes, and database-backed listing queries |
| Accounts | Registration, email verification, login/logout, password reset, signed HttpOnly sessions, role checks, admin TOTP MFA |
| Marketplace | Country and category routes, purpose filters, pagination, grid/list/map views, details, favourites, Google Maps links |
| Admin | Property drafts and lifecycle actions, bulk-import review, inventory targets, countries, FX, verification, documents, investments, translations, reports, and audit views |
| Communication | Contact Admin flow, enquiries, persistent conversations and messages; no public property checkout |
| Internationalization | `en`, `fr`, `es`, `ar`, `de`, `pt`, `zh`, `ja` routes, locale preference, English fallback, RTL direction, local currency/date formatting; translation coverage remains incomplete |
| Storage | S3-compatible private objects and signed retrieval; live provider and scanner still need configuration |

The public marketplace queries MongoDB rather than embedding property arrays in React components. Currency comes from each property's country and stored local amount; changing interface language does not change that amount or currency. Public production eligibility requires a published, verified, non-demo listing with a recorded verification decision.

The project layout is:

```text
src/app/[locale]/       Localized public, user, and admin pages
src/app/api/            API route handlers
src/components/         Shared UI and forms
src/lib/                Models, auth, pricing, storage, marketplace, and business rules
src/data/               Country registry and academic reference data
public/                 Brand assets, flags, image library, and blank import templates
scripts/                Guarded audit, setup, import, and development tools
tests/e2e/              Playwright browser tests
tests/integration/      Isolated MongoDB integration tests
docs/                   Detailed inventory, import, and implementation notes
```

## Environment configuration

Copy [.env.example](.env.example); do not put credentials in that committed template. Values below are **variable names only**.

| Purpose | Variables | Notes |
| --- | --- | --- |
| MongoDB | `MONGODB_URI`, `MONGODB_DB_NAME` | Set an explicit database; development scripts verify the target. |
| Authentication | `AUTH_SECRET`, `ADMIN_MFA_ENCRYPTION_KEY` | Use independent values of at least 32 characters. |
| App URL | `APP_BASE_URL` | Base URL used for links and metadata. |
| First development admin | `GH_BOOTSTRAP_ADMIN_NAME`, `GH_BOOTSTRAP_ADMIN_EMAIL`, `GH_BOOTSTRAP_ADMIN_PHONE`, `GH_BOOTSTRAP_ADMIN_COUNTRY_CODE`, `GH_BOOTSTRAP_ADMIN_PASSWORD` | Bootstrap-only private inputs. Use a full international phone number and uppercase ISO alpha-2 country code. |
| Central contact | `ADMIN_DISPLAY_NAME`, `ADMIN_SUPPORT_EMAIL`, `ADMIN_WHATSAPP_NUMBER` | Public support defaults; authorized admins can manage contact settings. |
| Transactional email | `EMAIL_FROM`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | Configure an SMTP provider before relying on verification/reset email. |
| Private object storage | `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | Use a private S3-compatible bucket. |
| Scan callback | `IDENTITY_SCAN_WEBHOOK_SECRET` | Required for trusted clean/infected document decisions. |
| Maps | `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY`, `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`, `GOOGLE_MAPS_API_KEY` | Browser key is intentionally public; restrict it by website and Maps API. The server key is reserved for server-side use. Maps links work without interactive-map keys. |
| FX | `FX_BASE_CURRENCY`, `FX_PROVIDER_API_KEY` | USD is the reference. A live provider adapter is not configured by default. |
| Local-only modes | `ACADEMIC_INVENTORY_ENABLED`, `ALLOW_SYNTHETIC_FIXTURES` | Leave disabled for production. |

Never commit `.env`, bootstrap credentials, MFA enrollment files, private keys, database exports, or production data. `.gitignore` covers these local artifacts. `NEXT_PUBLIC_*` values are exposed to the browser by design; never put a secret in one.

## Database and administrator setup

### 1. Confirm the target

```powershell
npm run inventory:audit
```

This read-only command reports the selected database, visible database names, collections, and inventory counts. It does not change records or print credentials. If the connection selects the wrong database, correct `MONGODB_DB_NAME` privately before continuing. Do not initialize a new database merely because the selected one appears empty.

### 2. Initialize configuration, when needed

```powershell
npm run seed:countries
```

This idempotently loads country and locale configuration after checking the explicit database target. It preserves existing country enablement and rejects currency changes that conflict with existing listings. It does **not** create property records. The registry has 250 country/territory records, with 243 enabled by default; administrators can manage enablement.

### 3. Create the first development administrator, when needed

The bootstrap script is restricted to `globalhome_dev`, requires an enabled admin country, refuses production mode, and refuses to create a second admin. Configure the five `GH_BOOTSTRAP_ADMIN_*` inputs and MFA encryption key privately, then run:

```powershell
npm run admin:bootstrap:dev -- --create
npm run admin:mfa -- --bootstrap-admin
```

The first command hashes the password and creates the verified admin account. The second writes an enrollment URI to ignored `.private/admin-mfa-enrollment.txt`; enroll it in an authenticator and securely delete the file. Never paste passwords or MFA secrets into issues, chat, logs, or documentation. An admin completes the separate TOTP challenge after entering email and password.

## Inventory workflows

### Real properties

The Admin property area supports creating/editing drafts and managing status, availability, location, local price, media, and verification evidence. An authorized bulk import can preview CSV, XLSX, or JSON and report row failures; accepted rows remain **unpublished drafts**. See the [import field guide and blank templates](docs/property-import-template.md). Review provenance and media rights, record verification evidence, then publish through the Admin workflow. Verified published properties become searchable on the marketplace. The per-country minimum target is **100 legitimate published listings**, with no maximum; the target never causes automatic public record creation.

New property prices are validated against an approved recent FX snapshot. The local-currency amount is the source price and the USD equivalent is an audit/reference value. The **currently implemented** bands in `src/lib/pricing.ts` are:

| Purpose | Current USD reference range |
| --- | --- |
| Rent | $2,000–$20,000 per month |
| Lease | $5,000–$70,000 per month |
| Investment | $2,000–$200,000 |
| Sale | $20,000–$900,000 |

These values differ from an earlier master PDF. Confirm the approved business rules before using the system for real listings. The configured investment rate is **30% projected monthly profit**; projected amounts and recorded paid distributions are kept distinct. No live FX provider is assumed or silently approved.

### Academic development catalogue

The school-project catalogue may contain illustrative records in `globalhome_dev`. To browse records that **already exist**, set `MONGODB_DB_NAME=globalhome_dev` and `ACADEMIC_INVENTORY_ENABLED=true` in the ignored local environment file, restart `npm run dev`, and open `/en/properties`. Confirm counts without writing anything:

```powershell
npm run inventory:academic:audit
```

Academic visibility requires nonproduction mode, that exact database, and the explicit flag. The records retain their internal academic provenance and cannot pass the real-property verification/publication gate. **Do not rerun population to repair an empty page.** Population/update commands are separately guarded and documented in [docs/academic-inventory.md](docs/academic-inventory.md), along with image sources and licensing. Synthetic unit-test fixtures are isolated from the application database.

## Development commands

| Command | Use |
| --- | --- |
| `npm run dev` | Start Next.js development server (port 3000 by default). |
| `npm run build` | Create an optimized production build. |
| `npm run start` | Serve a completed build. |
| `npm run inventory:audit` | Inspect the configured database without writes. |
| `npm run seed:countries` | Initialize country/locale metadata in the verified target. |
| `npm run inventory:academic:audit` | Read academic counts in guarded `globalhome_dev`. |
| `npm run lint` | Run ESLint. |
| `npm run typecheck` | Run TypeScript without emitting files. |
| `npm test` | Run Vitest unit tests. |
| `npm run test:integration` | Run isolated `mongodb-memory-server` integration tests. |
| `npm run test:e2e` | Run Playwright Chromium tests against a running server. |

Other scripts in `package.json` can write records or images. Read their guard conditions and the relevant guide before running them. Do not point them at production data.

## Testing and builds

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

For browser tests, start `npm run dev` in one terminal, then use another:

```powershell
$env:PLAYWRIGHT_BASE_URL='http://localhost:3000'
npm run test:e2e
```

Playwright otherwise targets port 3100 (see `playwright.config.ts`). Integration tests download or use a cached MongoDB binary and do **not** use `MONGODB_URI`; an unavailable binary can block that suite. To build without contacting a configured database, use process-level `GH_BUILD_OFFLINE=1` and an empty process-level `MONGODB_URI` for that build. A successful local build does not validate external services or production readiness.

## Security and production checklist

- Keep secrets server-side and use a deployment secret manager. Rotate any credential that was previously exposed.
- Restrict MongoDB access; back up the database and private object storage before operational changes.
- Configure SMTP and verify registration, verification, and reset mail end to end.
- Configure a private S3-compatible bucket and an approved malware scanner. Private document access requires authorization, signed URLs, and a clean scan result.
- Use sourced, approved FX snapshots. Verify local-currency pricing and the final business rules before accepting real listings.
- Publish only authorized real property records with verified provenance and media rights. Disable academic and synthetic-fixture modes in production.
- Review legal investment terms and payment processes. This repository does not provide a public checkout or guarantee projected returns.
- Complete database integration, authenticated browser journeys, security, accessibility, and translation coverage before deployment.

## Further documentation

- [Academic inventory mode, safeguards, and image attribution](docs/academic-inventory.md)
- [Property import template and field guide](docs/property-import-template.md)
- [Implementation audit and remaining gaps](docs/implementation-audit.md)

No deployment or remote push is part of local setup.

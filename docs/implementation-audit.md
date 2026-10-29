# GlobalHome implementation audit

Reviewed against the master specification and later real-inventory override. Status describes repository functionality, not a live deployment. No production database or external service was contacted.

| Area | Status | Main gap |
|---|---|---|
| Authentication | PARTIAL | Profile/password settings and verification resend screen added; registration now rejects malformed requests, avoids internal error disclosure, and explains recovery after email delivery failure. Session management UI and database integration tests remain. |
| Email verification | PARTIAL | Delivery and resend need integration tests |
| Password reset | PARTIAL | Password-changed notice added; integration tests remain |
| RBAC | PARTIAL | User/admin checks exist; route-by-route audit needed |
| Admin authorization | PARTIAL | MFA exists; broader management routes need review |
| Internationalization | PARTIAL | Eight locale routes, persistence and fallback work; account settings translated, but many pages and admin forms remain English |
| Country system | PARTIAL | Registry/flags/admin toggle; operational validation needed |
| Currency system | PARTIAL | Local amounts and Intl; broader UI validation needed |
| FX system | PARTIAL | Approved snapshots, exact local-minor-unit range checks and a mockable provider interface; no approved live provider adapter |
| Property CRUD | PARTIAL | Create/edit/import; additional admin fields/actions needed |
| Property publication | PARTIAL | Verification gate, lifecycle actions and audit fields added; database integration tests remain |
| Property media | PARTIAL | Private upload, cover/order/removal/video added; database integration tests remain |
| Marketplace | PARTIAL | Database listings, category pages and coordinate-based map mode; browser map credentials and live-data testing absent |
| Search/filtering | PARTIAL | Server filtering/pagination; mobile drawer/map filters absent |
| Favourites | PARTIAL | Persistent API/dashboard and public save controls; database integration tests absent |
| Recently viewed | PARTIAL | Private authenticated history and clear action; database integration tests absent |
| Property details | PARTIAL | Gallery, optional video/tour, coordinate map and contact; linked property documents and live-data tests absent |
| Maps | PARTIAL | Validated coordinate markers and Google Maps link fallback; live Maps JavaScript key/map ID absent |
| Enquiries | PARTIAL | Persistent enquiries, status transitions, agreed amount and audit; database integration tests absent |
| Messaging | PARTIAL | Authorized persistence, unread counts and read markers; live polling and database integration tests incomplete |
| Admin contact | PARTIAL | Central settings work; live support values require configuration |
| Identity verification | PARTIAL | MIME/signature/extension checks, private upload/download, review reasons and access audit; external scanner/KYC provider absent |
| Investment | PARTIAL | Investor profile, approved offering, pending/active position, funding reference, recorded distribution ledger and user/admin UI; signed-term evidence and live integration unverified |
| User dashboard | PARTIAL | Real counts plus enquiry, messages, saved/recent properties, documents, investments, statements, settings and verification; more workflow/translation polish remains |
| Admin dashboard | PARTIAL | Inventory, properties, countries, FX, settings, identity, investments, documents, reports, users, languages/translations and audit views; content and notification management remain incomplete |
| Notifications | PARTIAL | Stored records and read API/UI; full event coverage and database tests absent |
| Email notifications | PARTIAL | Plain-text and escaped HTML, SMTP port/TLS checks, English/French/Arabic event copy; live delivery and retry testing remain |
| Private documents | PARTIAL | Admin upload, metadata, clean-scan gate, owner/admin signed download and access audit; external scanner and storage tests absent |
| Audit logs | PARTIAL | Events written and authorized paginated review UI; event coverage and database tests incomplete |
| Security | PARTIAL | Core controls exist; full route review and integration tests needed |
| Accessibility | PARTIAL | Basic labels/focus/semantics; complete QA needed |
| Responsive layouts | PARTIAL | Landing page restored with utility bar, compact navigation, six category cards and five-item trust strip; home/auth tested at seven widths plus landing checks at 390, 768, 1366 and 1920 pixels and Arabic mobile. Authenticated/database screens not yet tested at those widths |
| Tests | PARTIAL | 93 unit and 18 browser tests, including deterministic 100-per-country fixture coverage; isolated MongoDB suite written but binary download denied |
| Documentation | PARTIAL | Setup/import/map notes; production operations/backup notes incomplete |

Additional areas: statements are PARTIAL (paid distribution records only); reporting is PARTIAL (MongoDB aggregations without live data verification); FX synchronization is EXTERNALLY BLOCKED pending selection and credentials for an approved provider; live SMTP is EXTERNALLY BLOCKED pending credentials and delivery tests; live S3 storage is EXTERNALLY BLOCKED pending a private bucket and test credentials; live Google Maps rendering is EXTERNALLY BLOCKED pending a website-restricted browser key and map ID; professional KYC/malware scanning is EXTERNALLY BLOCKED pending an approved provider and webhook secret. Full translation coverage, public-property document relationships, admin content tools, and complete end-to-end workflow tests are NOT IMPLEMENTED.

External services still needed for live use: isolated MongoDB test database or in-memory Mongo binary, SMTP, private S3-compatible object storage, an approved identity malware scanner/KYC integration, sourced FX updates, and optional Maps API integration. Genuine property inventory must be provided and verified by authorized parties.

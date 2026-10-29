# Authorized property import template

The downloadable [CSV](../public/templates/property-import/properties.csv), [XLSX](../public/templates/property-import/properties.xlsx), and [JSON](../public/templates/property-import/properties.json) templates are empty. They contain no listings. The JSON root must be an array of objects using the same field names as the spreadsheet header. An administrator selects one enabled country and confirms authorization for the named source before previewing or importing. Files may contain 1–5,000 rows and may be split into multiple batches.

| Field | Requirement | Meaning |
| --- | --- | --- |
| `sourceReference` | Required | Stable unique identifier from the authorized source. Used with the source provider for duplicate detection. |
| `title`, `slug` | Required | Public title and unique lowercase URL slug (`a-z`, `0-9`, hyphens). |
| `propertyType`, `purpose` | Required | Supported property category and `buy`, `rent`, `lease`, or `invest`. |
| `countryCode`, `currencyCode` | Required | ISO alpha-2 country and its configured ISO currency. Must match the selected enabled country. |
| `city`, `localPriceMinor` | Required | City and actual local price as an integer in minor currency units. Never enter a USD price with a substituted symbol. |
| `region`, `addressText` | Optional | Source supplied region and authorized public address. Missing address is reported as a warning. |
| `latitude`, `longitude` | Both or neither | Source supplied decimal coordinates. Missing coordinates are reported as a warning and no map marker is shown. |
| `bedrooms`, `bathrooms` | Optional | Nonnegative whole numbers where applicable. |
| `landAreaSqm`, `buildingAreaSqm` | Optional | Nonnegative square metres where applicable. |
| `description`, `amenities` | Optional | Source supplied text; CSV/XLSX amenities are separated with `|`, JSON uses an array or the same string format. |
| `videoUrl`, `virtualTourUrl` | Optional | HTTPS URLs without embedded credentials. |
| `availabilityStatus` | Optional | `available`, `reserved`, `unavailable`, `sold`, `rented`, or `leased`. Missing availability becomes `unavailable` until reviewed. |

The source/provider name and authorization confirmation are entered in the Admin form, not in each row. The importer calculates USD reference values from an approved recent FX snapshot and enforces the platform's purpose-specific USD equivalent ranges. It records the FX rate, provider, and effective date used. Accepted rows remain **draft and pending verification**. Validation never claims ownership, verifies a property, approves media, or publishes a listing.

Images are deliberately absent from these templates. Upload authorized images to private object storage through the property editor, confirm publishing rights, review them, and approve a cover image before publication. Internal fields such as `isDemo`, `status`, `verificationStatus`, `verifiedBy`, `adminVendorId`, `fxRate`, and `importBatchId` cannot be supplied by an import file. The Admin import history retains row-level failures and duplicate counts. A retry skips existing source references and slugs.

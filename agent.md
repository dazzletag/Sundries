# AI Agent Operating Contract

This file defines the operating contract for any AI agent (e.g. CODEX) assisting on this repository.

The purpose of this contract is to ensure correctness, determinism, security, and auditability
as project complexity increases.

Convenience must never override clarity or correctness.

---

## Role

You are an **engineering assistant**, not an execution oracle.

Optimise for:
- correctness
- determinism
- security
- auditability

Do **not** optimise for speed or convenience if doing so introduces:
- hidden state
- ambiguity
- fragility
- implicit assumptions

---

## Execution & Reality

You may operate across **all execution surfaces**, including:

- Local machine (PowerShell / Bash)
- GitHub Actions
- Azure DevOps pipelines
- Explicit agent / execution runtimes (when clearly attached)

Rules:

- Never claim to have executed a command unless execution is **real and observable**.
- If execution is not currently attached:
  - design automation that *will* execute elsewhere
  - state clearly where and how it will run

Execution context must always be explicit:
- **who** (identity)
- **where** (subscription, resource group)
- **how** (CLI, CI runner, agent)

---

## Assumptions & State

Assume **no prior state** unless it has been explicitly demonstrated in the current session.

Do **not** rely on:
- remembered permissions
- earlier execution capability
- implied authentication
- resources “probably already existing”

All assumptions must be stated explicitly before being used.

---

## Identity & Secrets (Non-Negotiable)

- Never infer identity.
- Always use explicit identifiers:
  - `tenantId`
  - `subscriptionId`
  - `clientId`
  - `objectId`

- Prefer **RBAC** over legacy access policies.
- Secrets must flow **only** via:
  - Azure Key Vault
  - CI/CD secrets

Prohibited:
- inline secrets
- placeholder values that resemble real credentials

If identity is ambiguous, stop and surface the ambiguity.

---

## Deployment Philosophy

- Prefer **idempotent IaC** (Bicep / Terraform) over imperative CLI steps.
- Leave **debug logging enabled until the first fully green run**.
- Fail fast on ambiguity.
- Optimise for **repeatability and diagnosability** over speed.

If a deployment step mutates state irreversibly, call it out explicitly before proceeding.

---

## Decision Policy

When multiple valid approaches exist:

1. Choose the **safest option**
2. Explain **why** it is safest
3. Mention at least one alternative and why it was rejected

If a decision is high-impact or hard to reverse, stop and ask before proceeding.

---

## Observability Requirements

Any deployment or automation must surface:

- authenticated identity (“who am I”)
- target scope (subscription / resource group)
- concrete outputs (IDs, URLs, resource names)

Phrases such as:
- “this should work”
- “normally”
- “usually”

are not acceptable without observable evidence.

---

## Style & Communication

- Be **explanatory but grounded**.
- Avoid reassurance language (“should”, “probably”, “ought to”).
- Prefer boring, explicit solutions over clever abstractions.
- Surface uncertainty early.

---

## Failure Handling

When something fails:

- Diagnose from first principles.
- Do not change strategy silently.
- Do not route into convenience abstractions to “get past” the issue.
- State clearly:
  - what failed
  - why
  - what changed as a result

---

## Primary Objective

Produce systems that:

- can be rerun without ceremony
- can be understood months later
- do not depend on hidden state
- do not rely on AI memory or conversational continuity

---

## Compliance

Any agent operating on this repository is expected to:
- read this file before acting
- explicitly state when it cannot comply
- default to safety and explicitness when uncertain

---

## Sundries CI/CD + CareHQ Route That Worked (2026-01-30)

This section documents the working deployment path and required settings so we can repeat it without rediscovering steps.

### Canonical CI build order (API)
- In `.github/workflows/deploy.yml` deploy_api job:
  - `shell: bash`, `working-directory: api`
  - Order is **mandatory**:
    1) `npm ci`
    2) `npx prisma generate`
    3) `npm run build`
  - Package with Unix zip:
    - `zip -r api.zip dist prisma node_modules package.json package-lock.json`
  - Validate ZIP path separators:
    - `unzip -l artifacts/api.zip | grep '\\' && exit 1 || echo "ZIP paths OK"`
  - Validate runtime deps present:
    - `unzip -l artifacts/api.zip | grep -q 'node_modules/fastify/package.json$' || exit 1`

### Deploy workflow guardrails
- Infra deployment is now skipped on push to avoid overwriting app settings:
  - `Deploy infrastructure`, `Extract key vault name`, `Grant pipeline ...`, `Run Prisma migrations` run **only** on `workflow_dispatch`.
  - `Save deployment outputs` falls back to `https://sundries-api-prod.azurewebsites.net` if outputs file is missing.
- Frontend build envs:
  - `VITE_API_BASE_URL`, `VITE_AAD_CLIENT_ID`, `VITE_AAD_TENANT_ID`, `VITE_API_AUDIENCE`, `VITE_API_SCOPES` passed in workflow.

### Prisma + migrations
- `schema.prisma` generator must include:
  - `binaryTargets = ["native", "debian-openssl-1.1.x", "debian-openssl-3.0.x"]`
- Migration lock provider must be `mssql`.
- CareHQ residents model stored without FK (to avoid missing CareHome table at migration time):
  - `CareHqResident` has `careHomeName` and no relation.

### App Service settings that are critical
- `TENANT_ID` = `44a1be07-ba53-4b40-8c4b-8a48ce5f1b0e`
- `API_AUDIENCE` = `api://44a1be07-ba53-4b40-8c4b-8a48ce5f1b0e/sundries-api`
- `DATABASE_URL` must be **sqlserver://** format (Key Vault reference was not resolving reliably):
  - Example: `sqlserver://sundriessqlv6bo7ekyb6loq.database.windows.net:1433;database=sundriesdb;user=sundriesadmin;password=...;encrypt=true;trustServerCertificate=false;`
- CareHQ secrets:
  - `CAREHQ_ACCOUNT_ID`, `CAREHQ_API_KEY`, `CAREHQ_API_SECRET`

### Key Vault and App Service identity
- Key Vault name used: `sundrieskvq3eyetqzg6j`
- KV secret names with hyphens (no underscores):
  - `CAREHQ-ACCOUNT-ID`, `CAREHQ-API-KEY`, `CAREHQ-API-SECRET`
- App Service managed identity must have KV `get/list` (access policy).

### SQL connectivity
- SQL server: `sundriessqlv6bo7ekyb6loq`
- Public network access: **Enabled**
- Firewall rules:
  - `AllowAzureServices` (0.0.0.0/0) enabled to allow App Service.
- Connection policy set to **Proxy**:
  - `az sql server conn-policy update ... --connection-type Proxy`

### Auth/JWT fixes applied
- JWKS URL uses:
  - `https://login.microsoftonline.com/{tenantId}/discovery/v2.0/keys`
- Accept both issuer formats:
  - `https://login.microsoftonline.com/{tenantId}/v2.0`
  - `https://sts.windows.net/{tenantId}/`
- jose `JWT.verify` return shape handled (payload may be returned directly).

### MSAL (frontend)
- Added `handleRedirectPromise` after `initialize`.
- Prevent duplicate redirects.
- Derive API scopes from audience; prefer `VITE_API_SCOPES`.
- Ensure SPA build receives:
  - `VITE_API_SCOPES = api://44a1be07-ba53-4b40-8c4b-8a48ce5f1b0e/sundries-api/access_as_user`

### Static Web Apps routing
- Added `web/staticwebapp.config.json` with SPA rewrite for `/dashboard` and other routes.

### CareHQ sync
- Endpoint: `POST /carehq/residents/sync`
- Cache endpoint: `GET /carehq/residents`
- Sync returns `{ synced, total, lastSyncedAt }`
- Paging: treat 404 on page>1 as end of results.
- CareHQ client dynamic import with fallback to `/dist/index.js` to avoid ESM export errors.

### UI updates
- Residents page now has:
  - **Sync now** button
  - Care Home filter dropdown

### Notes
- If API deploy returns 502 but `/health` is OK, the pipeline continues; check Kudu deployment logs for actual status.
- If API fails to start with `DATABASE_URL` errors, reset `DATABASE_URL` directly in App Service and restart.

---

## PowerApps Migration Plan (SQL + Graph + Per-Home Permissions) (2026-01-30)

Decisions confirmed:
- **Fully migrate** the PowerApps data to SQL (no SharePoint/Excel as source of truth).
- **Email/PDF** flows will use **Microsoft Graph** (not Power Automate).
- **Per-home permissioning** is required, with an **admin/settings** area.

### PowerApps reference model (for parity)
Source app and flow live under `PowerApps/`:
- PowerApp export: `PowerApps/Microsoft.PowerApps/apps/3993876067650085744/Nb0bbd96e-6118-48cb-836e-8efe0424efde-document.msapp`
- Flow: `PowerApps/Microsoft.Flow/flows/674c19b3-cbd0-45b2-bd20-9402f7b67e66/definition.json`

Key data sources in PowerApps (to migrate into SQL):
- `ResidentConsent` (consent flags, notes, attachments, current resident flag)
- `tblPrices` (items + prices per vendor account)
- `tblSales` (service line items: date, vendor, resident, price, itemId, invoiced)
- `tblOrders` (newspaper orders w/ day-of-week flags)
- `Newpapers` (newspaper catalog with price + weekday/weekend)
- `Vendors` (Excel tables: account ref, name, def nom code, address)
- `currentRoomlist` (CareHQ residents list)

### Target SQL schema (high level)
New tables (or Prisma models) to replace SharePoint/Excel:
- `Vendor` (accountRef, name, defNomCode, address lines, contact, isActive)
- `PriceItem` (vendorId, description, price, validFrom, isActive)
- `ResidentConsent` (residentId, careHomeId, flags, notes, attachments)
- `SaleItem` (residentId, vendorId, itemId, date, price, invoiced, invoiceNo, suId)
- `Newspaper` (title, price, weekdayOrWeekend, sort)
- `NewspaperOrder` (residentId, newspaperId/title, price, Mon–Sun flags)
- `UserHomeRole` (userId, careHomeId, role)

Existing `CareHqResident` remains the resident source of truth (synced from CareHQ).

### API endpoints to add/expand
Consents:
- `GET /consents?careHomeId=...`
- `PATCH /consents/:id` (toggle flags, notes)
- `POST /consents/:id/attachments` (Graph upload to SharePoint/OneDrive or Azure Blob)

Vendors + Prices:
- `GET /vendors`
- `GET /price-items?vendorId=...`
- `POST /price-items` / `PATCH /price-items/:id`

Service billing:
- `POST /sales`
- `DELETE /sales/:id`
- `GET /sales?vendorId=...&careHomeId=...&invoiced=false`
- `POST /invoices` (HTML→PDF→email via Graph; optionally mark sale items invoiced)

Newspapers:
- `GET /newspapers`
- `GET /newspaper-orders?residentId=...`
- `POST /newspaper-orders` (upsert by resident+title, update day flags)
- `GET /newspaper-orders/today?careHomeId=...`

Admin/settings:
- `GET /admin/users`
- `PATCH /admin/users/:id/homes` (assign/remove care homes + role)
- `GET /admin/homes` (for home list management)

### Permissions model (per-home)
- Add `UserHomeRole` table and middleware:
  - User must have role for care home to access residents/consents/sales/orders.
  - Admin role can manage users and home assignments.
- UI shows only assigned homes in the home selector.

### Graph integration
- Use Graph to send PDF emails (replace PowerAppV2 flow).
- PDF generation from server-side HTML (same templates as PowerApps).
- Store a copy in Blob or SharePoint (decide which).

### Migration tasks
1. Import vendors + price lists (Excel → SQL).
2. Import residents + consents (CareHQ sync + consent bootstrap).
3. Import legacy sales/orders if needed (SharePoint export → SQL).
4. Freeze PowerApps once parity reached.

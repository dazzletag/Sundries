# Azure SQL Schema Design

## Core Tables

- **CareHome**: `id` (uuid PK), `name` (string), `region` (string), `isActive` (boolean), `createdAt`, `updatedAt`.
- **Supplier**: `id`, `name`, `serviceType` (ENUM('Hairdressing','Chiropody','MutualAid','Other')), `email`, `phone`, `defaultRate`, `isActive`, `createdAt`, `updatedAt`.
- **Service** *(optional reference)*: `id`, `name`, `defaultUnit` (ENUM('visit','item')), `defaultRate`, `serviceType`, `isActive`.
- **Resident**: `id`, `careHomeId` (FK), `firstName`, `lastName`, `dob`, `isActive`, `createdAt`, `updatedAt`.
- **Consent**: `id`, `residentId`, `supplierId`, `serviceType`, `consentGivenAt`, `consentExpiresAt` (nullable), `notes`, `createdBy`, `createdAt`, `status` (ENUM('Active','Paused','Revoked')).
- **Visit**: `id`, `careHomeId`, `supplierId`, `visitedAt`, `status` (ENUM('Draft','Confirmed','Invoiced')), `createdBy`, `createdAt`, `lockedAt`, `notes`.
- **VisitItem**: `id`, `visitId`, `residentId`, `description`, `qty`, `unitPrice`, `vatRate`, `lineTotal`, `consentSnapshotId`, `createdAt`, `updatedAt`.
- **Invoice**: `id`, `supplierId`, `careHomeId`, `invoiceNo`, `periodStart`, `periodEnd`, `issuedAt`, `subtotal`, `vatTotal`, `total`, `status` (ENUM('Draft','Issued','Paid')), `targetFileUrl`.
- **InvoiceItem**: `id`, `invoiceId`, `visitItemId`, `description`, `qty`, `unitPrice`, `vatRate`, `lineTotal`.
- **AuditLog**: `id`, `actorUpn`, `action`, `entityType`, `entityId`, `at`, `detailsJson`.

## Rules and Constraints
1. **Consent gate**: Visit items require an active consent covering the `visitedAt` timestamp for the given resident/supplier/service type.
2. **Invoice numbering**: Sequential per supplier using `{supplierCode}-{YYYYMM}-{sequence4}`; the sequence resets monthly but never reuses numbers to keep accounting clean.
3. **Totals**: All monetary totals computed server-side from visit items; VAT applied per line and rolled up.
4. **Visit locking**: Once `Invoice` captures a `Visit`, its `status` becomes `Invoiced` and `lockedAt` prevents further edits.
5. **Audit logging**: Mutations write to `AuditLog` with actor UPN, action label, entity details, and timestamp for traceability.
6. **Roles**: Home users are scoped to their care homes; finance can generate invoices; admins manage configuration and uploads.

## Prisma Mapping Notes
- Use enums for service types, unit types, and statuses.
- Index foreign keys and frequently filtered timestamps (e.g., `visitedAt`, `issuedAt`).
- Calculated totals live in `VisitItem.lineTotal`, `Invoice` aggregates, and the invoice generator ensures precision with `Decimal`.

This design balances normalization with performance and is ready for Prisma migrations.

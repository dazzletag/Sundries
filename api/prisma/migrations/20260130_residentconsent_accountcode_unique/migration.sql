-- Drop unique constraint on careHqResidentId to allow multiple NULL rows
IF EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = 'ResidentConsent_careHqResidentId_key')
BEGIN
  ALTER TABLE [dbo].[ResidentConsent] DROP CONSTRAINT [ResidentConsent_careHqResidentId_key];
END

-- Ensure index on careHqResidentId for lookups
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'ResidentConsent_careHqResidentId_idx')
BEGIN
  CREATE NONCLUSTERED INDEX [ResidentConsent_careHqResidentId_idx] ON [dbo].[ResidentConsent]([careHqResidentId]);
END

-- Add unique constraint per care home + account code
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'ResidentConsent_careHomeId_accountCode_key')
BEGIN
  CREATE UNIQUE NONCLUSTERED INDEX [ResidentConsent_careHomeId_accountCode_key]
  ON [dbo].[ResidentConsent]([careHomeId], [accountCode]);
END

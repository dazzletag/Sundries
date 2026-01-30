CREATE TABLE [dbo].[VisitSheet] (
  [id] NVARCHAR(1000) NOT NULL,
  [careHomeId] NVARCHAR(1000) NOT NULL,
  [vendorId] NVARCHAR(1000) NOT NULL,
  [visitDate] DATETIME2 NOT NULL,
  [createdBy] NVARCHAR(255) NOT NULL,
  [createdAt] DATETIME2 NOT NULL CONSTRAINT [VisitSheet_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT [VisitSheet_pkey] PRIMARY KEY CLUSTERED ([id])
);

CREATE UNIQUE NONCLUSTERED INDEX [VisitSheet_careHomeId_vendorId_visitDate_key]
ON [dbo].[VisitSheet]([careHomeId],[vendorId],[visitDate]);

CREATE NONCLUSTERED INDEX [VisitSheet_careHomeId_idx] ON [dbo].[VisitSheet]([careHomeId]);
CREATE NONCLUSTERED INDEX [VisitSheet_vendorId_idx] ON [dbo].[VisitSheet]([vendorId]);

ALTER TABLE [dbo].[VisitSheet] ADD CONSTRAINT [VisitSheet_careHomeId_fkey]
  FOREIGN KEY ([careHomeId]) REFERENCES [dbo].[CareHome]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[VisitSheet] ADD CONSTRAINT [VisitSheet_vendorId_fkey]
  FOREIGN KEY ([vendorId]) REFERENCES [dbo].[Vendor]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

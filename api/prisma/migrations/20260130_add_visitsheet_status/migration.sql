ALTER TABLE [dbo].[VisitSheet] ADD [status] VARCHAR(16) NOT NULL CONSTRAINT [VisitSheet_status_df] DEFAULT 'Draft';
ALTER TABLE [dbo].[VisitSheet] ADD [signedAt] DATETIME2 NULL;

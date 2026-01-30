BEGIN TRY

BEGIN TRAN;

IF OBJECT_ID(N'[dbo].[CareHome]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[CareHome] (
        [id] NVARCHAR(1000) NOT NULL,
        [name] NVARCHAR(1000) NOT NULL,
        [region] NVARCHAR(1000) NOT NULL CONSTRAINT [CareHome_region_df] DEFAULT 'UK South',
        [isActive] BIT NOT NULL CONSTRAINT [CareHome_isActive_df] DEFAULT 1,
        [createdAt] DATETIME2 NOT NULL CONSTRAINT [CareHome_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
        [updatedAt] DATETIME2 NOT NULL,
        CONSTRAINT [CareHome_pkey] PRIMARY KEY CLUSTERED ([id])
    );
END

IF NOT EXISTS (SELECT 1 FROM [dbo].[CareHome] WHERE [name] = 'Glebe House')
    INSERT INTO [dbo].[CareHome] ([id], [name], [region], [isActive], [createdAt], [updatedAt])
    VALUES (NEWID(), 'Glebe House', 'UK South', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

IF NOT EXISTS (SELECT 1 FROM [dbo].[CareHome] WHERE [name] = 'Beech House')
    INSERT INTO [dbo].[CareHome] ([id], [name], [region], [isActive], [createdAt], [updatedAt])
    VALUES (NEWID(), 'Beech House', 'UK South', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

IF NOT EXISTS (SELECT 1 FROM [dbo].[CareHome] WHERE [name] = 'Field House')
    INSERT INTO [dbo].[CareHome] ([id], [name], [region], [isActive], [createdAt], [updatedAt])
    VALUES (NEWID(), 'Field House', 'UK South', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

IF NOT EXISTS (SELECT 1 FROM [dbo].[CareHome] WHERE [name] = 'Quarry House')
    INSERT INTO [dbo].[CareHome] ([id], [name], [region], [isActive], [createdAt], [updatedAt])
    VALUES (NEWID(), 'Quarry House', 'UK South', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW;

END CATCH

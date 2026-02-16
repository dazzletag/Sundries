BEGIN TRY

BEGIN TRAN;

-- Drop existing unique constraint so we can replace it with a filtered index
IF EXISTS (
    SELECT 1
    FROM sys.indexes idx
    JOIN sys.objects obj ON idx.object_id = obj.object_id
    WHERE obj.name = 'AppUser'
      AND idx.name = 'AppUser_upn_key'
)
BEGIN
    ALTER TABLE [dbo].[AppUser] DROP CONSTRAINT [AppUser_upn_key];
END

-- Create a filtered unique index that ignores NULL UPNs
CREATE UNIQUE INDEX [AppUser_upn_key]
ON [dbo].[AppUser]([upn])
WHERE [upn] IS NOT NULL;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW;

END CATCH

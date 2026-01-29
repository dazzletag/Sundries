CREATE TABLE [dbo].[CareHqResident] (
    [id] NVARCHAR(191) NOT NULL,
    [careHomeId] NVARCHAR(191) NOT NULL,
    [careHqLocationId] NVARCHAR(191) NOT NULL,
    [careHqRoomId] NVARCHAR(191) NOT NULL,
    [roomNumber] NVARCHAR(191) NOT NULL,
    [fullName] NVARCHAR(191),
    [accountCode] NVARCHAR(191),
    [serviceUserId] NVARCHAR(191),
    [isVacant] BIT NOT NULL CONSTRAINT [CareHqResident_isVacant_df] DEFAULT 0,
    [lastSyncedAt] DATETIME2 NOT NULL CONSTRAINT [CareHqResident_lastSyncedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [CareHqResident_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [CareHqResident_pkey] PRIMARY KEY ([id])
);

CREATE UNIQUE INDEX [CareHqResident_careHqRoomId_key] ON [dbo].[CareHqResident]([careHqRoomId]);

ALTER TABLE [dbo].[CareHqResident]
ADD CONSTRAINT [CareHqResident_careHomeId_fkey]
FOREIGN KEY ([careHomeId]) REFERENCES [dbo].[CareHome]([id])
ON DELETE NO ACTION
ON UPDATE NO ACTION;

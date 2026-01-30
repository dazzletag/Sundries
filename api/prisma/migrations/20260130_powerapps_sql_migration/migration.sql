BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[CareHqResident] ADD [careHomeId] NVARCHAR(1000);

-- CreateTable
CREATE TABLE [dbo].[AppUser] (
    [id] NVARCHAR(1000) NOT NULL,
    [oid] NVARCHAR(1000) NOT NULL,
    [upn] NVARCHAR(1000),
    [displayName] NVARCHAR(1000),
    [isActive] BIT NOT NULL CONSTRAINT [AppUser_isActive_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [AppUser_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [AppUser_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [AppUser_oid_key] UNIQUE NONCLUSTERED ([oid]),
    CONSTRAINT [AppUser_upn_key] UNIQUE NONCLUSTERED ([upn])
);

-- CreateTable
CREATE TABLE [dbo].[UserHomeRole] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [careHomeId] NVARCHAR(1000) NOT NULL,
    [role] VARCHAR(32) NOT NULL CONSTRAINT [UserHomeRole_role_df] DEFAULT 'User',
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [UserHomeRole_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [UserHomeRole_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [UserHomeRole_userId_careHomeId_key] UNIQUE NONCLUSTERED ([userId],[careHomeId])
);

-- CreateTable
CREATE TABLE [dbo].[Vendor] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [accountRef] NVARCHAR(1000) NOT NULL,
    [defNomCode] VARCHAR(16),
    [tradeContact] NVARCHAR(1000),
    [address1] NVARCHAR(1000),
    [address2] NVARCHAR(1000),
    [address3] NVARCHAR(1000),
    [address4] NVARCHAR(1000),
    [address5] NVARCHAR(1000),
    [isActive] BIT NOT NULL CONSTRAINT [Vendor_isActive_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Vendor_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Vendor_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Vendor_accountRef_key] UNIQUE NONCLUSTERED ([accountRef])
);

-- CreateTable
CREATE TABLE [dbo].[PriceItem] (
    [id] NVARCHAR(1000) NOT NULL,
    [vendorId] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(1000) NOT NULL,
    [price] DECIMAL(10,2) NOT NULL,
    [validFrom] DATETIME2,
    [isActive] BIT NOT NULL CONSTRAINT [PriceItem_isActive_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [PriceItem_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [PriceItem_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ResidentConsent] (
    [id] NVARCHAR(1000) NOT NULL,
    [careHomeId] NVARCHAR(1000) NOT NULL,
    [careHqResidentId] NVARCHAR(1000),
    [roomNumber] NVARCHAR(1000),
    [fullName] NVARCHAR(1000),
    [accountCode] NVARCHAR(1000),
    [serviceUserId] NVARCHAR(1000),
    [sundryConsentReceived] BIT NOT NULL CONSTRAINT [ResidentConsent_sundryConsentReceived_df] DEFAULT 0,
    [newspapersConsent] BIT NOT NULL CONSTRAINT [ResidentConsent_newspapersConsent_df] DEFAULT 0,
    [chiropodyConsent] BIT NOT NULL CONSTRAINT [ResidentConsent_chiropodyConsent_df] DEFAULT 0,
    [hairdressersConsent] BIT NOT NULL CONSTRAINT [ResidentConsent_hairdressersConsent_df] DEFAULT 0,
    [shopConsent] BIT NOT NULL CONSTRAINT [ResidentConsent_shopConsent_df] DEFAULT 0,
    [otherConsent] BIT NOT NULL CONSTRAINT [ResidentConsent_otherConsent_df] DEFAULT 0,
    [comments] NVARCHAR(1000),
    [chiropodyNote] NVARCHAR(1000),
    [shopNote] NVARCHAR(1000),
    [currentResident] BIT NOT NULL CONSTRAINT [ResidentConsent_currentResident_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ResidentConsent_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [ResidentConsent_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [ResidentConsent_careHqResidentId_key] UNIQUE NONCLUSTERED ([careHqResidentId])
);

-- CreateTable
CREATE TABLE [dbo].[ConsentAttachment] (
    [id] NVARCHAR(1000) NOT NULL,
    [residentConsentId] NVARCHAR(1000) NOT NULL,
    [fileName] NVARCHAR(1000) NOT NULL,
    [fileUrl] NVARCHAR(1000) NOT NULL,
    [uploadedBy] NVARCHAR(1000),
    [uploadedAt] DATETIME2 NOT NULL CONSTRAINT [ConsentAttachment_uploadedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [ConsentAttachment_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[SaleItem] (
    [id] NVARCHAR(1000) NOT NULL,
    [careHomeId] NVARCHAR(1000) NOT NULL,
    [careHqResidentId] NVARCHAR(1000) NOT NULL,
    [vendorId] NVARCHAR(1000) NOT NULL,
    [priceItemId] NVARCHAR(1000),
    [description] NVARCHAR(1000) NOT NULL,
    [price] DECIMAL(10,2) NOT NULL,
    [date] DATETIME2 NOT NULL,
    [invoiced] BIT NOT NULL CONSTRAINT [SaleItem_invoiced_df] DEFAULT 0,
    [invoiceNumber] NVARCHAR(1000),
    [serviceUserId] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [SaleItem_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [SaleItem_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Newspaper] (
    [id] NVARCHAR(1000) NOT NULL,
    [title] NVARCHAR(1000) NOT NULL,
    [price] DECIMAL(10,2) NOT NULL,
    [weekdayOrWeekend] VARCHAR(16),
    [sort] INT NOT NULL CONSTRAINT [Newspaper_sort_df] DEFAULT 0,
    [isActive] BIT NOT NULL CONSTRAINT [Newspaper_isActive_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Newspaper_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Newspaper_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Newspaper_title_key] UNIQUE NONCLUSTERED ([title])
);

-- CreateTable
CREATE TABLE [dbo].[NewspaperOrder] (
    [id] NVARCHAR(1000) NOT NULL,
    [careHomeId] NVARCHAR(1000) NOT NULL,
    [careHqResidentId] NVARCHAR(1000) NOT NULL,
    [newspaperId] NVARCHAR(1000) NOT NULL,
    [itemTitle] NVARCHAR(1000) NOT NULL,
    [price] DECIMAL(10,2) NOT NULL,
    [monday] BIT NOT NULL CONSTRAINT [NewspaperOrder_monday_df] DEFAULT 0,
    [tuesday] BIT NOT NULL CONSTRAINT [NewspaperOrder_tuesday_df] DEFAULT 0,
    [wednesday] BIT NOT NULL CONSTRAINT [NewspaperOrder_wednesday_df] DEFAULT 0,
    [thursday] BIT NOT NULL CONSTRAINT [NewspaperOrder_thursday_df] DEFAULT 0,
    [friday] BIT NOT NULL CONSTRAINT [NewspaperOrder_friday_df] DEFAULT 0,
    [saturday] BIT NOT NULL CONSTRAINT [NewspaperOrder_saturday_df] DEFAULT 0,
    [sunday] BIT NOT NULL CONSTRAINT [NewspaperOrder_sunday_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [NewspaperOrder_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [NewspaperOrder_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [NewspaperOrder_careHqResidentId_newspaperId_key] UNIQUE NONCLUSTERED ([careHqResidentId],[newspaperId])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [PriceItem_vendorId_idx] ON [dbo].[PriceItem]([vendorId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ResidentConsent_careHomeId_idx] ON [dbo].[ResidentConsent]([careHomeId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ConsentAttachment_residentConsentId_idx] ON [dbo].[ConsentAttachment]([residentConsentId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [SaleItem_careHomeId_idx] ON [dbo].[SaleItem]([careHomeId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [SaleItem_vendorId_idx] ON [dbo].[SaleItem]([vendorId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [SaleItem_careHqResidentId_idx] ON [dbo].[SaleItem]([careHqResidentId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [NewspaperOrder_careHomeId_idx] ON [dbo].[NewspaperOrder]([careHomeId]);

-- AddForeignKey
ALTER TABLE [dbo].[CareHqResident] ADD CONSTRAINT [CareHqResident_careHomeId_fkey] FOREIGN KEY ([careHomeId]) REFERENCES [dbo].[CareHome]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[UserHomeRole] ADD CONSTRAINT [UserHomeRole_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[AppUser]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[UserHomeRole] ADD CONSTRAINT [UserHomeRole_careHomeId_fkey] FOREIGN KEY ([careHomeId]) REFERENCES [dbo].[CareHome]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[PriceItem] ADD CONSTRAINT [PriceItem_vendorId_fkey] FOREIGN KEY ([vendorId]) REFERENCES [dbo].[Vendor]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ResidentConsent] ADD CONSTRAINT [ResidentConsent_careHomeId_fkey] FOREIGN KEY ([careHomeId]) REFERENCES [dbo].[CareHome]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ResidentConsent] ADD CONSTRAINT [ResidentConsent_careHqResidentId_fkey] FOREIGN KEY ([careHqResidentId]) REFERENCES [dbo].[CareHqResident]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ConsentAttachment] ADD CONSTRAINT [ConsentAttachment_residentConsentId_fkey] FOREIGN KEY ([residentConsentId]) REFERENCES [dbo].[ResidentConsent]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[SaleItem] ADD CONSTRAINT [SaleItem_careHomeId_fkey] FOREIGN KEY ([careHomeId]) REFERENCES [dbo].[CareHome]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[SaleItem] ADD CONSTRAINT [SaleItem_careHqResidentId_fkey] FOREIGN KEY ([careHqResidentId]) REFERENCES [dbo].[CareHqResident]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[SaleItem] ADD CONSTRAINT [SaleItem_vendorId_fkey] FOREIGN KEY ([vendorId]) REFERENCES [dbo].[Vendor]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[SaleItem] ADD CONSTRAINT [SaleItem_priceItemId_fkey] FOREIGN KEY ([priceItemId]) REFERENCES [dbo].[PriceItem]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[NewspaperOrder] ADD CONSTRAINT [NewspaperOrder_careHomeId_fkey] FOREIGN KEY ([careHomeId]) REFERENCES [dbo].[CareHome]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[NewspaperOrder] ADD CONSTRAINT [NewspaperOrder_careHqResidentId_fkey] FOREIGN KEY ([careHqResidentId]) REFERENCES [dbo].[CareHqResident]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[NewspaperOrder] ADD CONSTRAINT [NewspaperOrder_newspaperId_fkey] FOREIGN KEY ([newspaperId]) REFERENCES [dbo].[Newspaper]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH


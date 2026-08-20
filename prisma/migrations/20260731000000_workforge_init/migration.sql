-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "mobile" TEXT,
    "mobileVerified" BOOLEAN NOT NULL DEFAULT false,
    "passwordHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "natureOfBusiness" TEXT,
    "industries" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "manpowerBand" TEXT,
    "categoriesUsed" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "entityType" TEXT,
    "website" TEXT,
    "contactName" TEXT NOT NULL,
    "contactDesignation" TEXT,
    "contactMobile" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "district" TEXT,
    "state" TEXT NOT NULL,
    "pincode" TEXT,
    "gstin" TEXT,
    "pan" TEXT,
    "cin" TEXT,
    "about" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "moderationNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firmName" TEXT NOT NULL,
    "entityType" TEXT,
    "ownerName" TEXT NOT NULL,
    "ownerDesignation" TEXT,
    "yearEstablished" INTEGER,
    "website" TEXT,
    "address" TEXT,
    "city" TEXT NOT NULL,
    "district" TEXT,
    "state" TEXT NOT NULL,
    "pincode" TEXT,
    "presenceStates" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "workerSourceStates" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "industries" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "roles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "willingOutstation" BOOLEAN NOT NULL DEFAULT false,
    "pan" TEXT,
    "gstin" TEXT,
    "labourLicenceNo" TEXT,
    "esicNo" TEXT,
    "epfNo" TEXT,
    "totalWorkforce" INTEGER NOT NULL DEFAULT 0,
    "availableNow" INTEGER NOT NULL DEFAULT 0,
    "mobilizationDays" INTEGER NOT NULL DEFAULT 7,
    "about" TEXT,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "ratingDeployment" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratingCompliance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratingWorkerPayment" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratingManpowerQuality" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratingResponsiveness" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "moderationNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorClient" (
    "id" TEXT NOT NULL,
    "contractorId" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "industry" TEXT,
    "siteCity" TEXT NOT NULL,
    "siteState" TEXT NOT NULL,
    "category" TEXT,
    "scope" TEXT,
    "headcount" INTEGER NOT NULL DEFAULT 0,
    "startedYear" INTEGER,
    "endedYear" INTEGER,
    "ongoing" BOOLEAN NOT NULL DEFAULT true,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractorClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorCapacity" (
    "id" TEXT NOT NULL,
    "contractorId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "strength" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,

    CONSTRAINT "ContractorCapacity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "contractorId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Requirement" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "industry" TEXT,
    "description" TEXT,
    "scopeKey" TEXT,
    "outputQuantity" INTEGER,
    "outputUnit" TEXT,
    "outputPeriod" TEXT,
    "deliverables" TEXT,
    "siteName" TEXT,
    "city" TEXT NOT NULL,
    "district" TEXT,
    "state" TEXT NOT NULL,
    "pincode" TEXT,
    "startDate" TIMESTAMP(3),
    "durationType" TEXT,
    "durationMonths" INTEGER,
    "shift" TEXT,
    "urgency" TEXT NOT NULL DEFAULT 'NORMAL',
    "accommodationProvided" BOOLEAN NOT NULL DEFAULT false,
    "transportProvided" BOOLEAN NOT NULL DEFAULT false,
    "foodProvided" BOOLEAN NOT NULL DEFAULT false,
    "ppeProvided" BOOLEAN NOT NULL DEFAULT false,
    "preferredRateBasis" TEXT,
    "indicativeBudget" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "expiresAt" TIMESTAMP(3),
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Requirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequirementRole" (
    "id" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "headcount" INTEGER NOT NULL,
    "experienceBand" TEXT,
    "qualification" TEXT,
    "indicativeWage" INTEGER,
    "notes" TEXT,

    CONSTRAINT "RequirementRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proposal" (
    "id" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "contractorId" TEXT NOT NULL,
    "rateBasis" TEXT NOT NULL,
    "rateAmount" INTEGER NOT NULL,
    "headcountOffered" INTEGER,
    "indicativeCrewSize" INTEGER,
    "mobilizationDays" INTEGER NOT NULL DEFAULT 7,
    "validityDays" INTEGER NOT NULL DEFAULT 30,
    "coverNote" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Proposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequirementInvite" (
    "id" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "contractorId" TEXT NOT NULL,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequirementInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Engagement" (
    "id" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "contractorId" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "rateBasis" TEXT NOT NULL,
    "rateAmount" INTEGER NOT NULL,
    "headcount" INTEGER,
    "estimatedValue" INTEGER NOT NULL DEFAULT 0,
    "platformFeePercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "estimatedFee" INTEGER NOT NULL DEFAULT 0,
    "companyRating" INTEGER,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Engagement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorReview" (
    "id" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "contractorId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "deployment" INTEGER NOT NULL,
    "compliance" INTEGER NOT NULL,
    "workerPayment" INTEGER NOT NULL,
    "manpowerQuality" INTEGER NOT NULL,
    "responsiveness" INTEGER NOT NULL,
    "overall" DOUBLE PRECISION NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractorReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactUnlock" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "contractorId" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'SEARCH',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactUnlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimit" (
    "key" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key","windowStart")
);

-- CreateTable
CREATE TABLE "Setting" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "platformName" TEXT NOT NULL DEFAULT 'WorkForge',
    "requireCompanyApproval" BOOLEAN NOT NULL DEFAULT false,
    "requireContractorApproval" BOOLEAN NOT NULL DEFAULT true,
    "contactMaskingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "freeContactRevealsPerMonth" INTEGER NOT NULL DEFAULT 10,
    "paymentsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "platformFeePercent" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_status_idx" ON "User"("role", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyProfile_userId_key" ON "CompanyProfile"("userId");

-- CreateIndex
CREATE INDEX "CompanyProfile_status_createdAt_idx" ON "CompanyProfile"("status", "createdAt");

-- CreateIndex
CREATE INDEX "CompanyProfile_state_city_idx" ON "CompanyProfile"("state", "city");

-- CreateIndex
CREATE INDEX "CompanyProfile_verified_idx" ON "CompanyProfile"("verified");

-- CreateIndex
CREATE UNIQUE INDEX "ContractorProfile_userId_key" ON "ContractorProfile"("userId");

-- CreateIndex
CREATE INDEX "ContractorProfile_status_createdAt_idx" ON "ContractorProfile"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ContractorProfile_status_state_verified_rating_idx" ON "ContractorProfile"("status", "state", "verified", "rating");

-- CreateIndex
CREATE INDEX "ContractorProfile_status_verified_rating_idx" ON "ContractorProfile"("status", "verified", "rating");

-- CreateIndex
CREATE INDEX "ContractorProfile_status_totalWorkforce_idx" ON "ContractorProfile"("status", "totalWorkforce");

-- CreateIndex
CREATE INDEX "ContractorClient_contractorId_ongoing_headcount_idx" ON "ContractorClient"("contractorId", "ongoing", "headcount");

-- CreateIndex
CREATE INDEX "ContractorClient_siteState_siteCity_idx" ON "ContractorClient"("siteState", "siteCity");

-- CreateIndex
CREATE INDEX "ContractorClient_industry_idx" ON "ContractorClient"("industry");

-- CreateIndex
CREATE INDEX "ContractorCapacity_category_strength_idx" ON "ContractorCapacity"("category", "strength");

-- CreateIndex
CREATE UNIQUE INDEX "ContractorCapacity_contractorId_category_key" ON "ContractorCapacity"("contractorId", "category");

-- CreateIndex
CREATE INDEX "Document_contractorId_createdAt_idx" ON "Document"("contractorId", "createdAt");

-- CreateIndex
CREATE INDEX "Document_status_createdAt_idx" ON "Document"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Requirement_status_expiresAt_createdAt_idx" ON "Requirement"("status", "expiresAt", "createdAt");

-- CreateIndex
CREATE INDEX "Requirement_status_category_expiresAt_idx" ON "Requirement"("status", "category", "expiresAt");

-- CreateIndex
CREATE INDEX "Requirement_companyId_createdAt_idx" ON "Requirement"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "Requirement_status_state_city_idx" ON "Requirement"("status", "state", "city");

-- CreateIndex
CREATE INDEX "RequirementRole_requirementId_idx" ON "RequirementRole"("requirementId");

-- CreateIndex
CREATE INDEX "RequirementRole_role_idx" ON "RequirementRole"("role");

-- CreateIndex
CREATE INDEX "Proposal_requirementId_status_idx" ON "Proposal"("requirementId", "status");

-- CreateIndex
CREATE INDEX "Proposal_contractorId_createdAt_idx" ON "Proposal"("contractorId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Proposal_requirementId_contractorId_key" ON "Proposal"("requirementId", "contractorId");

-- CreateIndex
CREATE INDEX "RequirementInvite_contractorId_status_createdAt_idx" ON "RequirementInvite"("contractorId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RequirementInvite_requirementId_contractorId_key" ON "RequirementInvite"("requirementId", "contractorId");

-- CreateIndex
CREATE UNIQUE INDEX "Engagement_proposalId_key" ON "Engagement"("proposalId");

-- CreateIndex
CREATE INDEX "Engagement_companyId_createdAt_idx" ON "Engagement"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "Engagement_contractorId_createdAt_idx" ON "Engagement"("contractorId", "createdAt");

-- CreateIndex
CREATE INDEX "Engagement_requirementId_idx" ON "Engagement"("requirementId");

-- CreateIndex
CREATE INDEX "Engagement_status_idx" ON "Engagement"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ContractorReview_engagementId_key" ON "ContractorReview"("engagementId");

-- CreateIndex
CREATE INDEX "ContractorReview_contractorId_createdAt_idx" ON "ContractorReview"("contractorId", "createdAt");

-- CreateIndex
CREATE INDEX "ContractorReview_companyId_createdAt_idx" ON "ContractorReview"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "ContactUnlock_companyId_createdAt_idx" ON "ContactUnlock"("companyId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ContactUnlock_companyId_contractorId_key" ON "ContactUnlock"("companyId", "contractorId");

-- CreateIndex
CREATE INDEX "Message_engagementId_createdAt_idx" ON "Message"("engagementId", "createdAt");

-- CreateIndex
CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");

-- CreateIndex
CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "RateLimit_windowStart_idx" ON "RateLimit"("windowStart");

-- AddForeignKey
ALTER TABLE "CompanyProfile" ADD CONSTRAINT "CompanyProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorProfile" ADD CONSTRAINT "ContractorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorClient" ADD CONSTRAINT "ContractorClient_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "ContractorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorCapacity" ADD CONSTRAINT "ContractorCapacity_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "ContractorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "ContractorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Requirement" ADD CONSTRAINT "Requirement_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CompanyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementRole" ADD CONSTRAINT "RequirementRole_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "ContractorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementInvite" ADD CONSTRAINT "RequirementInvite_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementInvite" ADD CONSTRAINT "RequirementInvite_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "ContractorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Engagement" ADD CONSTRAINT "Engagement_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Engagement" ADD CONSTRAINT "Engagement_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CompanyProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Engagement" ADD CONSTRAINT "Engagement_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "ContractorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Engagement" ADD CONSTRAINT "Engagement_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorReview" ADD CONSTRAINT "ContractorReview_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "Engagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorReview" ADD CONSTRAINT "ContractorReview_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "ContractorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorReview" ADD CONSTRAINT "ContractorReview_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CompanyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactUnlock" ADD CONSTRAINT "ContactUnlock_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CompanyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactUnlock" ADD CONSTRAINT "ContactUnlock_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "ContractorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "Engagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------
-- GIN indexes on the text[] columns.
--
-- Prisma cannot express these in schema.prisma, but the contractor search
-- filters on every one of them with `hasSome`, which compiles to the array
-- overlap operator (&&). Without a GIN index each of those filters is a
-- sequential scan over the whole contractor table.
-- ---------------------------------------------------------------------------

CREATE INDEX "ContractorProfile_presenceStates_idx"
  ON "ContractorProfile" USING GIN ("presenceStates");

CREATE INDEX "ContractorProfile_workerSourceStates_idx"
  ON "ContractorProfile" USING GIN ("workerSourceStates");

CREATE INDEX "ContractorProfile_categories_idx"
  ON "ContractorProfile" USING GIN ("categories");

CREATE INDEX "ContractorProfile_industries_idx"
  ON "ContractorProfile" USING GIN ("industries");

CREATE INDEX "ContractorProfile_roles_idx"
  ON "ContractorProfile" USING GIN ("roles");

CREATE INDEX "CompanyProfile_industries_idx"
  ON "CompanyProfile" USING GIN ("industries");

CREATE INDEX "CompanyProfile_categoriesUsed_idx"
  ON "CompanyProfile" USING GIN ("categoriesUsed");

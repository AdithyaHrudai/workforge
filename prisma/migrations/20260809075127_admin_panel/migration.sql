-- Admin panel: a separate administrator identity, server-side admin sessions,
-- verification documents for companies as well as contractors, and an audit
-- trail that can attribute an action to either kind of actor.
--
-- Hand-edited after `prisma migrate dev --create-only`. Prisma's diff wanted to
-- drop the seven GIN indexes on the text[] columns, because it cannot express
-- them in the schema and therefore does not know they are deliberate. They are
-- what keeps contractor search off a sequential scan, so those DROP INDEX
-- statements have been removed. Do not reinstate them.

-- ---------------------------------------------------------------------------
-- Administrators
-- ---------------------------------------------------------------------------

CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "adminCode" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'VERIFIER',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "lastLoginIp" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdminUser_adminCode_key" ON "AdminUser"("adminCode");
CREATE UNIQUE INDEX "AdminUser_username_key" ON "AdminUser"("username");
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");
CREATE INDEX "AdminUser_status_createdAt_idx" ON "AdminUser"("status", "createdAt");

ALTER TABLE "AdminUser" ADD CONSTRAINT "AdminUser_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Only the two roles the application understands, and only the two account
-- states. Enforced here as well as in the actions: a role typo that reached the
-- database would silently create an account nothing can authorise.
ALTER TABLE "AdminUser" ADD CONSTRAINT "AdminUser_role_check"
  CHECK ("role" IN ('SUPER_ADMIN', 'VERIFIER'));
ALTER TABLE "AdminUser" ADD CONSTRAINT "AdminUser_status_check"
  CHECK ("status" IN ('ACTIVE', 'REVOKED'));

-- ---------------------------------------------------------------------------
-- Admin sessions
--
-- One row per live sign-in, holding only the SHA-256 of the session token, so a
-- database dump yields no usable session.
-- ---------------------------------------------------------------------------

CREATE TABLE "AdminSession" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "AdminSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdminSession_tokenHash_key" ON "AdminSession"("tokenHash");
CREATE INDEX "AdminSession_adminId_createdAt_idx" ON "AdminSession"("adminId", "createdAt");
CREATE INDEX "AdminSession_expiresAt_idx" ON "AdminSession"("expiresAt");

ALTER TABLE "AdminSession" ADD CONSTRAINT "AdminSession_adminId_fkey"
  FOREIGN KEY ("adminId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Review provenance on both profiles
-- ---------------------------------------------------------------------------

ALTER TABLE "CompanyProfile"
  ADD COLUMN "reviewedAt" TIMESTAMP(3),
  ADD COLUMN "reviewedById" TEXT;

ALTER TABLE "CompanyProfile" ADD CONSTRAINT "CompanyProfile_reviewedById_fkey"
  FOREIGN KEY ("reviewedById") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ContractorProfile"
  ADD COLUMN "reviewedAt" TIMESTAMP(3),
  ADD COLUMN "reviewedById" TEXT;

ALTER TABLE "ContractorProfile" ADD CONSTRAINT "ContractorProfile_reviewedById_fkey"
  FOREIGN KEY ("reviewedById") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Documents belong to a contractor OR a company
-- ---------------------------------------------------------------------------

ALTER TABLE "Document"
  ADD COLUMN "companyId" TEXT,
  ADD COLUMN "reviewedAt" TIMESTAMP(3),
  ADD COLUMN "reviewedById" TEXT,
  ALTER COLUMN "contractorId" DROP NOT NULL;

CREATE INDEX "Document_companyId_createdAt_idx" ON "Document"("companyId", "createdAt");

ALTER TABLE "Document" ADD CONSTRAINT "Document_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "CompanyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Document" ADD CONSTRAINT "Document_reviewedById_fkey"
  FOREIGN KEY ("reviewedById") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Exactly one owner. Prisma cannot express this, and a document owned by both
-- parties — or by neither — would be visible to the wrong side or to nobody.
ALTER TABLE "Document" ADD CONSTRAINT "Document_one_owner_check"
  CHECK (("contractorId" IS NOT NULL AND "companyId" IS NULL)
      OR ("contractorId" IS NULL AND "companyId" IS NOT NULL));

-- ---------------------------------------------------------------------------
-- Audit log: two kinds of actor, neither of which can take the trail with them
-- ---------------------------------------------------------------------------

ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_actorId_fkey";

ALTER TABLE "AuditLog"
  ADD COLUMN "adminId" TEXT,
  ADD COLUMN "actorType" TEXT NOT NULL DEFAULT 'USER',
  ADD COLUMN "actorLabel" TEXT,
  ADD COLUMN "ip" TEXT,
  ALTER COLUMN "actorId" DROP NOT NULL;

CREATE INDEX "AuditLog_adminId_createdAt_idx" ON "AuditLog"("adminId", "createdAt");
CREATE INDEX "AuditLog_actorType_createdAt_idx" ON "AuditLog"("actorType", "createdAt");

ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_adminId_fkey"
  FOREIGN KEY ("adminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Historic rows were all written by marketplace users; label them from the
-- actor they still point at, so the log reads consistently either side of this
-- migration.
UPDATE "AuditLog" a
   SET "actorLabel" = u."name"
  FROM "User" u
 WHERE a."actorId" = u."id" AND a."actorLabel" IS NULL;

-- ---------------------------------------------------------------------------
-- Retire the legacy ADMIN role on User
--
-- Administrators are no longer marketplace users. Any User row still carrying
-- role='ADMIN' now has a role nothing in the application recognises: it cannot
-- reach the admin panel, and it has no dashboard of its own to land on. Rather
-- than leave those accounts in a state with no defined behaviour, they are
-- suspended — which is a reversible, auditable outcome, and produces a clear
-- message at the login form instead of a redirect loop.
--
-- Nothing is deleted. Re-provision the people concerned with
-- `npm run admin:create`, which creates a proper AdminUser.
-- ---------------------------------------------------------------------------

UPDATE "User"
   SET "status" = 'SUSPENDED',
       "tokenVersion" = "tokenVersion" + 1
 WHERE "role" = 'ADMIN' AND "status" <> 'SUSPENDED';

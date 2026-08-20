-- Udyam (MSME) registration number on the contractor profile.
--
-- Hand-written rather than generated: `prisma migrate diff` also proposes
-- dropping the GIN indexes on the array columns that back the contractor
-- search, because Prisma does not model index type and cannot see them.

ALTER TABLE "ContractorProfile" ADD COLUMN "udyamNo" TEXT;

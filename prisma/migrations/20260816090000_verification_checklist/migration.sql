-- Verification checklist: each side answers a yes/no question per document,
-- and a "yes" carries the registration number alongside the uploaded file.

ALTER TABLE "CompanyProfile" ADD COLUMN "clraRegNo" TEXT;
ALTER TABLE "CompanyProfile" ADD COLUMN "hasGst" BOOLEAN;
ALTER TABLE "CompanyProfile" ADD COLUMN "hasPan" BOOLEAN;
ALTER TABLE "CompanyProfile" ADD COLUMN "hasClra" BOOLEAN;

ALTER TABLE "ContractorProfile" ADD COLUMN "hasGst" BOOLEAN;
ALTER TABLE "ContractorProfile" ADD COLUMN "hasPan" BOOLEAN;

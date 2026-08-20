-- Google sign-in.
--
-- `passwordHash` becomes nullable so an account that only ever signs in with
-- Google has no password to guess. `googleId` holds Google's stable subject id,
-- which is matched before email because an email can be reassigned inside a
-- Workspace domain while the subject never changes.
--
-- Written by hand rather than generated: `prisma migrate diff` also wanted to
-- drop the GIN indexes on the array columns, which back the contractor search.
-- Prisma does not model index type, so it cannot see them as anything but
-- unknown, and following it would have silently gutted search performance.

ALTER TABLE "User" ADD COLUMN "googleId" TEXT;
ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP NOT NULL;

CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

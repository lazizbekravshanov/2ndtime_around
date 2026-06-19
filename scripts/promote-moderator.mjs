// Promote a user to MODERATOR by email:
//   node scripts/promote-moderator.mjs someone@uc.edu
// Sets both role=MODERATOR and isModerator=true so the moderation queue and
// the /funnel dashboard both unlock.
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const email = process.argv[2];

if (!email) {
  console.error("Usage: node scripts/promote-moderator.mjs <email>");
  process.exit(1);
}

const user = await db.user
  .update({
    where: { email },
    data: { role: "MODERATOR", isModerator: true },
  })
  .catch(() => null);

if (!user) {
  console.error(`No user found with email "${email}".`);
  await db.$disconnect();
  process.exit(1);
}

console.log(`Promoted ${email} to MODERATOR.`);
await db.$disconnect();

// Bootstrap script: creates one ADMIN user from env vars, or promotes an
// existing user to ADMIN if the email already exists. Idempotent — safe to
// run on every deploy. Run with: npm run seed:admin --workspace=apps/api
import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, UserRole } from '@prisma/client';

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const fullName = process.env.ADMIN_NAME ?? 'Admin';

  if (!email || !password) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set to seed the admin user.');
  }
  if (password.length < 8) {
    throw new Error('ADMIN_PASSWORD must be at least 8 characters.');
  }

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.role === UserRole.ADMIN) {
      console.log(`${email} is already an admin — nothing to do.`);
    } else {
      await prisma.user.update({ where: { email }, data: { role: UserRole.ADMIN } });
      console.log(`Promoted existing user ${email} to ADMIN.`);
    }
  } else {
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.create({
      data: { email, passwordHash, fullName, role: UserRole.ADMIN, emailVerified: true },
    });
    console.log(`Created admin user ${email}.`);
  }

  await prisma.$disconnect();
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});

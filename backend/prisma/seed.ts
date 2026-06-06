import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create default admin account
  const existingAdmin = await prisma.user.findUnique({
    where: { username: 'admin' },
  });

  if (existingAdmin) {
    console.log('✅ Admin account already exists. Skipping.');
  } else {
    const hashedPassword = await bcrypt.hash('admin123', 10);

    const admin = await prisma.user.create({
      data: {
        username: 'admin',
        password: hashedPassword,
        fullName: 'Administrator',
        role: 'admin',
      },
    });

    console.log(`✅ Admin account created:`);
    console.log(`   Username: admin`);
    console.log(`   Password: admin123`);
    console.log(`   ID: ${admin.id}`);
  }

  console.log('🌱 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

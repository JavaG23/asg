import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Creating test users...');

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@asg.org' },
    update: {},
    create: {
      email: 'admin@asg.org',
      name: 'Admin User',
      role: 'admin',
      phone: '555-0100',
    },
  });

  console.log('✓ Admin user created:', admin.email);

  // Create driver user
  const driver = await prisma.user.upsert({
    where: { email: 'driver@asg.org' },
    update: {},
    create: {
      email: 'driver@asg.org',
      name: 'Test Driver',
      role: 'driver',
      phone: '555-0200',
    },
  });

  console.log('✓ Driver user created:', driver.email);

  console.log('\nTest credentials:');
  console.log('Admin: admin@asg.org (no password required)');
  console.log('Driver: driver@asg.org (no password required)');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

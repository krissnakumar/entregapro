const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');

const prisma = new PrismaClient();

async function reset() {
  const email = 'admin@entregapro.com';
  const pass = 'admin123';
  const hash = await argon2.hash(pass);
  
  console.log(`Resetting ${email}...`);
  
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.log('User not found. Creating...');
    // We need a role ID. Let's find an ADMIN role.
    const role = await prisma.role.findFirst({ where: { name: 'ADMIN' } });
    if (!role) {
      console.log('ADMIN role not found. Please run seed first.');
      return;
    }
    await prisma.user.create({
      data: {
        email,
        password_hash: hash,
        name: 'Admin User',
        role_id: role.id,
        active_status: true,
      }
    });
  } else {
    await prisma.user.update({
      where: { id: user.id },
      data: { password_hash: hash, active_status: true }
    });
  }
  
  console.log('Success! Credentials set to admin@entregapro.com / admin123');
}

reset().finally(() => prisma.$disconnect());

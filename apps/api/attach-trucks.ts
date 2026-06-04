import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚛 Attaching trucks to drivers for Santa Inês...');

  const org = await prisma.organization.findFirst({
    where: { slug: 'santa-ines-deposito' },
  });

  if (!org) {
    console.error('Error: Organization santa-ines-deposito not found.');
    return;
  }

  // Get all drivers for the organization
  const drivers = await prisma.driver.findMany({
    where: { organizationId: org.id, deletedAt: null },
    include: { user: true },
  });

  // Sort them so assignments are deterministic
  const driverMapping: Record<string, string> = {
    'dito': 'DSI-0001',
    'beto': 'DSI-0002',
    'ze': 'DSI-0003',
    'zathau': 'DSI-0004',
    'japonese': 'DSI-0005',
    'taylor': 'DSI-0006',
    'alex': 'DSI-0007',
    'julio': 'DSI-0008',
    'cosmi': 'DSI-0009',
    'caio': 'DSI-0010',
  };

  for (const driver of drivers) {
    const email = driver.user.email;
    const targetPlate = driverMapping[email];
    if (targetPlate) {
      const vehicle = await prisma.vehicle.findFirst({
        where: { vehicleNumber: targetPlate, organizationId: org.id, deletedAt: null },
      });
      if (vehicle) {
        await prisma.driver.update({
          where: { id: driver.id },
          data: { vehicleId: vehicle.id },
        });
        console.log(`Attached driver ${driver.user.name} (${email}) to vehicle ${targetPlate}`);
      } else {
        console.log(`Vehicle ${targetPlate} not found for organization.`);
      }
    }
  }

  console.log('🎉 Truck assignments complete!');
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚛 Adding 10 additional trucks for Santa Inês...');

  const org = await prisma.organization.findFirst({
    where: { slug: 'santa-ines-deposito' },
  });

  if (!org) {
    console.error('Error: Organization santa-ines-deposito not found. Run seed-santa-ines.ts first.');
    return;
  }

  const trucks = [
    // 2x 10 ton Volkswagen
    { vehicleNumber: 'DSI-0006', type: 'Volkswagen 10 Ton', capacity: '10 Toneladas', fuelType: 'Diesel' },
    { vehicleNumber: 'DSI-0007', type: 'Volkswagen 10 Ton', capacity: '10 Toneladas', fuelType: 'Diesel' },
    // 3x 12 ton Volkswagen
    { vehicleNumber: 'DSI-0008', type: 'Volkswagen 12 Ton', capacity: '12 Toneladas', fuelType: 'Diesel' },
    { vehicleNumber: 'DSI-0009', type: 'Volkswagen 12 Ton', capacity: '12 Toneladas', fuelType: 'Diesel' },
    { vehicleNumber: 'DSI-0010', type: 'Volkswagen 12 Ton', capacity: '12 Toneladas', fuelType: 'Diesel' },
    // 5x Old Ford Truck
    { vehicleNumber: 'DSI-0011', type: 'Caminhão Ford Antigo', capacity: '8 Toneladas', fuelType: 'Diesel' },
    { vehicleNumber: 'DSI-0012', type: 'Caminhão Ford Antigo', capacity: '8 Toneladas', fuelType: 'Diesel' },
    { vehicleNumber: 'DSI-0013', type: 'Caminhão Ford Antigo', capacity: '8 Toneladas', fuelType: 'Diesel' },
    { vehicleNumber: 'DSI-0014', type: 'Caminhão Ford Antigo', capacity: '8 Toneladas', fuelType: 'Diesel' },
    { vehicleNumber: 'DSI-0015', type: 'Caminhão Ford Antigo', capacity: '8 Toneladas', fuelType: 'Diesel' },
  ];

  for (const truck of trucks) {
    const exists = await prisma.vehicle.findFirst({
      where: { vehicleNumber: truck.vehicleNumber, organizationId: org.id },
    });
    if (!exists) {
      await prisma.vehicle.create({
        data: {
          ...truck,
          activeStatus: true,
          organizationId: org.id,
        },
      });
      console.log(`Created truck: ${truck.vehicleNumber} - ${truck.type}`);
    } else {
      console.log(`Truck ${truck.vehicleNumber} already exists. Skipping.`);
    }
  }

  console.log('🎉 Successfully added 10 trucks to Depósito Santa Inês!');
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });

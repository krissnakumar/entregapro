import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Santa Inês Depósito...');

  // 1. Check if organization already exists
  let org = await prisma.organization.findFirst({
    where: { slug: 'santa-ines-deposito' },
  });

  if (org) {
    console.log('Organization Santa Inês Depósito already exists. Skipping creation.');
  } else {
    org = await prisma.organization.create({
      data: {
        name: 'Depósito Santa Inês',
        slug: 'santa-ines-deposito',
        document: '23.456.789/0001-01',
        phone: '(11) 4485-4099',
        email: 'contato@depositosantaines.com.br',
        address: 'Estrada Santa Inês, 4705 - Bairro Santa Inês',
        city: 'Mairiporã',
        state: 'SP',
      },
    });
    console.log(`Created Organization: ${org.name} (ID: ${org.id})`);
  }

  // 2. Fetch Growth Plan
  const growthPlan = await prisma.plan.findUnique({ where: { slug: 'growth' } });
  if (growthPlan) {
    // Check if subscription exists
    const subExists = await prisma.subscription.findFirst({
      where: { organizationId: org.id },
    });
    if (!subExists) {
      await prisma.subscription.create({
        data: {
          organizationId: org.id,
          planId: growthPlan.id,
          status: 'ACTIVE',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
      console.log('Created subscription for Santa Inês.');
    }
  }

  // 3. Fetch permissions
  const permissions = await prisma.permission.findMany();

  // 4. Create Roles for the organization
  let adminRole = await prisma.role.findFirst({
    where: { name: 'ADMIN', organizationId: org.id },
  });
  if (!adminRole) {
    adminRole = await prisma.role.create({
      data: {
        name: 'ADMIN',
        description: 'Administrador com acesso total',
        organizationId: org.id,
        permissions: { create: permissions.map(p => ({ permission_id: p.id })) },
      },
    });
  }

  let dispatcherRole = await prisma.role.findFirst({
    where: { name: 'DISPATCHER', organizationId: org.id },
  });
  if (!dispatcherRole) {
    dispatcherRole = await prisma.role.create({
      data: {
        name: 'DISPATCHER',
        description: 'Operador de logística',
        organizationId: org.id,
        permissions: {
          create: permissions
            .filter(p => !['MANAGE_USERS', 'MANAGE_ROLES', 'MANAGE_SETTINGS', 'MANAGE_SUBSCRIPTION', 'VIEW_AUDIT_LOGS'].includes(p.key))
            .map(p => ({ permission_id: p.id })),
        },
      },
    });
  }

  let driverRole = await prisma.role.findFirst({
    where: { name: 'DRIVER', organizationId: org.id },
  });
  if (!driverRole) {
    driverRole = await prisma.role.create({
      data: {
        name: 'DRIVER',
        description: 'Motorista de entregas',
        organizationId: org.id,
        permissions: {
          create: permissions
            .filter(p => ['VIEW_ASSIGNED_TASKS', 'UPDATE_DELIVERY_STATUS', 'EXECUTE_DELIVERY', 'UPLOAD_POD', 'SHARE_GPS_LIVE'].includes(p.key))
            .map(p => ({ permission_id: p.id })),
        },
      },
    });
  }

  console.log('🎭 Roles setup complete.');

  // 5. Create Users (Admin, Dispatchers, and Drivers)
  const passwordHash = await argon2.hash('123456');

  // Admin User
  const adminEmail = 'admin@depositosantaines.com.br';
  let adminUser = await prisma.user.findFirst({ where: { email: adminEmail } });
  if (!adminUser) {
    // Check if simple login user 'admin' or similar exists for this domain, let's create a custom 'admin.santaines' or 'admin-santaines'
    adminUser = await prisma.user.create({
      data: {
        email: 'admin.santaines',
        password_hash: passwordHash,
        name: 'Admin Santa Inês',
        phone: '(11) 4485-4099',
        role_id: adminRole.id,
        organizationId: org.id,
      },
    });
    console.log(`Created admin user: ${adminUser.email}`);
  }

  // Dispatchers (Felipe, Diago)
  const dispatchers = [
    { email: 'felipe', name: 'Felipe Logística' },
    { email: 'diago', name: 'Diago Logística' }
  ];

  for (const disp of dispatchers) {
    const userExists = await prisma.user.findFirst({ where: { email: disp.email } });
    if (!userExists) {
      const created = await prisma.user.create({
        data: {
          email: disp.email,
          password_hash: passwordHash,
          name: disp.name,
          phone: '(11) 98888-1234',
          role_id: dispatcherRole.id,
          organizationId: org.id,
        },
      });
      console.log(`Created dispatcher: ${created.email}`);
    }
  }

  // Drivers
  const driversList = [
    { email: 'dito', name: 'Dito', phone: '(11) 97777-1001', cnh: 'SP123456701' },
    { email: 'beto', name: 'Beto', phone: '(11) 97777-1002', cnh: 'SP123456702' },
    { email: 'ze', name: 'Zé', phone: '(11) 97777-1003', cnh: 'SP123456703' },
    { email: 'zathau', name: 'Zathau', phone: '(11) 97777-1004', cnh: 'SP123456704' },
    { email: 'japonese', name: 'Japonês', phone: '(11) 97777-1005', cnh: 'SP123456705' },
    { email: 'taylor', name: 'Taylor', phone: '(11) 97777-1006', cnh: 'SP123456706' },
    { email: 'alex', name: 'Alex', phone: '(11) 97777-1007', cnh: 'SP123456707' },
    { email: 'julio', name: 'Júlio', phone: '(11) 97777-1008', cnh: 'SP123456708' },
    { email: 'cosmi', name: 'Cosmi', phone: '(11) 97777-1009', cnh: 'SP123456709' },
    { email: 'caio', name: 'Caio', phone: '(11) 97777-1010', cnh: 'SP123456710' }
  ];

  for (const drv of driversList) {
    const userExists = await prisma.user.findFirst({ where: { email: drv.email } });
    if (!userExists) {
      const u = await prisma.user.create({
        data: {
          email: drv.email,
          password_hash: passwordHash,
          name: drv.name,
          phone: drv.phone,
          role_id: driverRole.id,
          organizationId: org.id,
        },
      });

      await prisma.driver.create({
        data: {
          userId: u.id,
          licenseNumber: drv.cnh,
          phone: drv.phone,
          availabilityStatus: true,
          organizationId: org.id,
        },
      });
      console.log(`Created driver: ${drv.email}`);
    }
  }

  // 6. Create Vehicles
  const vehiclesList = [
    { vehicleNumber: 'DSI-0001', type: 'Caminhão Baú Mercedes', capacity: '8 Toneladas', fuelType: 'Diesel' },
    { vehicleNumber: 'DSI-0002', type: 'Caminhão Caçamba Ford Cargo', capacity: '12 Toneladas', fuelType: 'Diesel' },
    { vehicleNumber: 'DSI-0003', type: 'Caminhão 3/4 Hyundai HR', capacity: '3 Toneladas', fuelType: 'Diesel' },
    { vehicleNumber: 'DSI-0004', type: 'Saveiro Pick-up', capacity: '700 kg', fuelType: 'Flex' },
    { vehicleNumber: 'DSI-0005', type: 'Fiorino Furgão', capacity: '650 kg', fuelType: 'Flex' }
  ];

  for (const veh of vehiclesList) {
    const vehExists = await prisma.vehicle.findFirst({
      where: { vehicleNumber: veh.vehicleNumber, organizationId: org.id },
    });
    if (!vehExists) {
      await prisma.vehicle.create({
        data: {
          ...veh,
          activeStatus: true,
          organizationId: org.id,
        },
      });
      console.log(`Created vehicle: ${veh.vehicleNumber}`);
    }
  }

  // 7. Create Customers
  const customersList = [
    { name: 'Residencial Alpes de Mairiporã', phone: '(11) 99888-3001', address: 'Estrada do Rio Acima, 3000 - Mairiporã, SP', lat: -23.3286, lng: -46.5666 },
    { name: 'Condomínio Suíça da Cantareira', phone: '(11) 99888-3002', address: 'Alameda dos Pinheiros, 150 - Mairiporã, SP', lat: -23.3400, lng: -46.5800 },
    { name: 'Construtora Cantareira', phone: '(11) 99888-3003', address: 'Avenida Cantareira, 1200 - Mairiporã, SP', lat: -23.3150, lng: -46.5900 },
    { name: 'Obra Vila Machado', phone: '(11) 99888-3004', address: 'Estrada Santa Inês, 2500 - Vila Machado, Mairiporã, SP', lat: -23.3520, lng: -46.6010 }
  ];

  for (const cust of customersList) {
    const custExists = await prisma.customer.findFirst({
      where: { name: cust.name, organizationId: org.id },
    });
    if (!custExists) {
      await prisma.customer.create({
        data: {
          name: cust.name,
          phone: cust.phone,
          address: cust.address,
          latitude: cust.lat,
          longitude: cust.lng,
          organizationId: org.id,
        },
      });
      console.log(`Created customer: ${cust.name}`);
    }
  }

  console.log('🎉 Seeding of Santa Inês Depósito completed successfully!');
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });

import { PrismaClient, Permission } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding EntregaPRO database...');

  // 1. Clear existing data
  console.log('🧹 Cleaning database...');
  await prisma.usageTracking.deleteMany();
  await prisma.billingEvent.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.deliveryTracking.deleteMany();
  await prisma.deliveryStatusLog.deleteMany();
  await prisma.invoiceItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.loadingVerification.deleteMany();
  await prisma.fuelLog.deleteMany();
  await prisma.maintenanceLog.deleteMany();
  await prisma.analyticsSnapshot.deleteMany();
  await prisma.whatsappMessage.deleteMany();
  await prisma.locationPing.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.auditLogEntry.deleteMany();
  await prisma.delivery.deleteMany();
  await prisma.order.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.zone.deleteMany();
  await prisma.geofence.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.systemSetting.deleteMany();

  // 2. Create Permissions
  console.log('🔑 Creating permissions...');
  const permissionsData = [
    { key: 'MANAGE_USERS', description: 'Criar e gerenciar usuários' },
    { key: 'MANAGE_ROLES', description: 'Gerenciar permissões e cargos' },
    { key: 'MANAGE_SETTINGS', description: 'Alterar configurações do sistema' },
    { key: 'VIEW_ANALYTICS', description: 'Ver relatórios e analytics' },
    { key: 'VIEW_AUDIT_LOGS', description: 'Ver logs de auditoria' },
    { key: 'MANAGE_WHATSAPP', description: 'Configurar WhatsApp' },
    { key: 'CREATE_DELIVERY', description: 'Criar novas entregas' },
    { key: 'ASSIGN_DRIVER', description: 'Atribuir motoristas' },
    { key: 'TRACK_DELIVERY', description: 'Rastrear entregas' },
    { key: 'MONITOR_OPERATIONS', description: 'Monitorar operações' },
    { key: 'MANAGE_CUSTOMERS', description: 'Gerenciar clientes' },
    { key: 'MANAGE_VEHICLES', description: 'Gerenciar veículos' },
    { key: 'MANAGE_ZONES', description: 'Gerenciar zonas de entrega' },
    { key: 'OPTIMIZE_DISPATCH', description: 'Otimizar rotas' },
    { key: 'VIEW_ASSIGNED_TASKS', description: 'Ver tarefas atribuídas' },
    { key: 'UPDATE_DELIVERY_STATUS', description: 'Atualizar status' },
    { key: 'EXECUTE_DELIVERY', description: 'Executar entregas' },
    { key: 'UPLOAD_POD', description: 'Enviar comprovante' },
    { key: 'SHARE_GPS_LIVE', description: 'Compartilhar localização' },
    { key: 'VIEW_INVOICES', description: 'Ver faturas' },
    { key: 'MANAGE_INVOICES', description: 'Gerenciar faturas' },
    { key: 'VIEW_FINANCIALS', description: 'Ver financeiro' },
    { key: 'MANAGE_SUBSCRIPTION', description: 'Gerenciar plano/assinatura' },
    { key: 'MANAGE_FLEET', description: 'Gerenciar frota' },
  ];

  const permissions: Permission[] = [];
  for (const p of permissionsData) {
    permissions.push(await prisma.permission.create({ data: p }));
  }

  // 3. Create Plans
  console.log('📋 Creating plans...');
  const plans = [
    {
      name: 'Starter',
      slug: 'starter',
      description: 'Para pequenas entregas',
      monthlyPrice: 99,
      trialDays: 7,
      maxDrivers: 3,
      maxDispatchers: 1,
      maxDeliveriesPerMonth: 100,
      maxVehicles: 3,
      maxCustomers: 50,
      hasRouteOptimization: false,
      hasLiveTracking: true,
      hasWhatsApp: false,
      hasCustomerPortal: false,
      hasAnalytics: true,
      hasConstructionModule: false,
      isPopular: false,
      sortOrder: 1,
    },
    {
      name: 'Growth',
      slug: 'growth',
      description: 'Para negócios em expansão',
      monthlyPrice: 299,
      trialDays: 7,
      maxDrivers: 15,
      maxDispatchers: 5,
      maxDeliveriesPerMonth: 1000,
      maxVehicles: 15,
      maxCustomers: 200,
      hasRouteOptimization: true,
      hasLiveTracking: true,
      hasWhatsApp: true,
      hasCustomerPortal: true,
      hasAnalytics: true,
      hasConstructionModule: false,
      isPopular: true,
      sortOrder: 2,
    },
    {
      name: 'Professional',
      slug: 'professional',
      description: 'Para operações completas',
      monthlyPrice: 699,
      trialDays: 7,
      maxDrivers: 50,
      maxDispatchers: 20,
      maxDeliveriesPerMonth: 5000,
      maxVehicles: 50,
      maxCustomers: 1000,
      hasRouteOptimization: true,
      hasLiveTracking: true,
      hasWhatsApp: true,
      hasCustomerPortal: true,
      hasAnalytics: true,
      hasConstructionModule: true,
      isPopular: false,
      sortOrder: 3,
    },
    {
      name: 'Enterprise',
      slug: 'enterprise',
      description: 'Solução personalizada',
      monthlyPrice: 0,
      trialDays: 0,
      maxDrivers: 999999,
      maxDispatchers: 999999,
      maxDeliveriesPerMonth: 999999,
      maxVehicles: 999999,
      maxCustomers: 999999,
      hasRouteOptimization: true,
      hasLiveTracking: true,
      hasWhatsApp: true,
      hasCustomerPortal: true,
      hasAnalytics: true,
      hasConstructionModule: true,
      isPopular: false,
      sortOrder: 4,
    },
  ];

  for (const plan of plans) {
    await prisma.plan.create({ data: plan });
  }

  // 4. Create Organizations
  console.log('🏢 Creating organizations...');
  const org1 = await prisma.organization.create({
    data: {
      name: 'Construtora Modelo LTDA',
      slug: 'construtora-modelo',
      document: '12.345.678/0001-90',
      phone: '(11) 99999-0001',
      email: 'admin@construtoramodelo.com.br',
      address: 'Av. Paulista, 1000',
      city: 'São Paulo',
      state: 'SP',
    },
  });

  const org2 = await prisma.organization.create({
    data: {
      name: 'Materiais de Construção ABC',
      slug: 'materiais-abc',
      document: '98.765.432/0001-10',
      phone: '(11) 98888-0002',
      email: 'contato@materiaisabc.com.br',
      address: 'Rua Augusta, 500',
      city: 'São Paulo',
      state: 'SP',
    },
  });

  // 5. Create Subscriptions
  console.log('📊 Creating subscriptions...');
  const growthPlan = await prisma.plan.findUnique({ where: { slug: 'growth' } });
  const starterPlan = await prisma.plan.findUnique({ where: { slug: 'starter' } });

  if (growthPlan) {
    await prisma.subscription.create({
      data: {
        organizationId: org1.id,
        planId: growthPlan.id,
        status: 'ACTIVE',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
  }

  if (starterPlan) {
    await prisma.subscription.create({
      data: {
        organizationId: org2.id,
        planId: starterPlan.id,
        status: 'TRIAL',
        trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
  }

  // 6. Create Roles for each organization
  console.log('🎭 Creating roles...');
  const adminRole1 = await prisma.role.create({
    data: {
      name: 'ADMIN',
      description: 'Administrador com acesso total',
      organizationId: org1.id,
      permissions: { create: permissions.map(p => ({ permission_id: p.id })) },
    },
  });

  const adminRole2 = await prisma.role.create({
    data: {
      name: 'ADMIN',
      description: 'Administrador com acesso total',
      organizationId: org2.id,
      permissions: { create: permissions.map(p => ({ permission_id: p.id })) },
    },
  });

  const dispatcherRole1 = await prisma.role.create({
    data: {
      name: 'DISPATCHER',
      description: 'Operador de logística',
      organizationId: org1.id,
      permissions: {
        create: permissions
          .filter(p => !['MANAGE_USERS', 'MANAGE_ROLES', 'MANAGE_SETTINGS', 'MANAGE_SUBSCRIPTION', 'VIEW_AUDIT_LOGS'].includes(p.key))
          .map(p => ({ permission_id: p.id })),
      },
    },
  });

  const dispatcherRole2 = await prisma.role.create({
    data: {
      name: 'DISPATCHER',
      description: 'Operador de logística',
      organizationId: org2.id,
      permissions: {
        create: permissions
          .filter(p => !['MANAGE_USERS', 'MANAGE_ROLES', 'MANAGE_SETTINGS', 'MANAGE_SUBSCRIPTION', 'VIEW_AUDIT_LOGS'].includes(p.key))
          .map(p => ({ permission_id: p.id })),
      },
    },
  });

  const driverRole1 = await prisma.role.create({
    data: {
      name: 'DRIVER',
      description: 'Motorista de entregas',
      organizationId: org1.id,
      permissions: {
        create: permissions
          .filter(p => ['VIEW_ASSIGNED_TASKS', 'UPDATE_DELIVERY_STATUS', 'EXECUTE_DELIVERY', 'UPLOAD_POD', 'SHARE_GPS_LIVE'].includes(p.key))
          .map(p => ({ permission_id: p.id })),
      },
    },
  });

  const driverRole2 = await prisma.role.create({
    data: {
      name: 'DRIVER',
      description: 'Motorista de entregas',
      organizationId: org2.id,
      permissions: {
        create: permissions
          .filter(p => ['VIEW_ASSIGNED_TASKS', 'UPDATE_DELIVERY_STATUS', 'EXECUTE_DELIVERY', 'UPLOAD_POD', 'SHARE_GPS_LIVE'].includes(p.key))
          .map(p => ({ permission_id: p.id })),
      },
    },
  });

  // 7. Create Users (Org 1 - Construtora Modelo)
  console.log('👤 Creating users for Construtora Modelo...');
  const hash1 = await argon2.hash('admin123');
  const hash2 = await argon2.hash('admin123');

  const adminUser1 = await prisma.user.create({
    data: {
      email: 'admin@construtoramodelo.com.br',
      password_hash: hash1,
      name: 'Carlos Admin',
      phone: '(11) 99999-0001',
      role_id: adminRole1.id,
      organizationId: org1.id,
    },
  });

  await prisma.user.create({
    data: {
      email: 'despachante@construtoramodelo.com.br',
      password_hash: hash1,
      name: 'Maria Despachante',
      phone: '(11) 99999-0002',
      role_id: dispatcherRole1.id,
      organizationId: org1.id,
    },
  });

  // Org 1 drivers
  const drivers1 = [
    { name: 'João Caminhoneiro', email: 'joao@cm.com.br', phone: '(11) 97777-0001', license: 'SP123456789' },
    { name: 'Pedro Entregas', email: 'pedro@cm.com.br', phone: '(11) 97777-0002', license: 'SP987654321' },
    { name: 'Lucas Frete', email: 'lucas@cm.com.br', phone: '(11) 97777-0003', license: 'SP456789123' },
  ];

  for (const drv of drivers1) {
    const hashedPass = await argon2.hash('driver123');
    const user = await prisma.user.create({
      data: {
        email: drv.email,
        password_hash: hashedPass,
        name: drv.name,
        phone: drv.phone,
        role_id: driverRole1.id,
        organizationId: org1.id,
      },
    });
    await prisma.driver.create({
      data: {
        userId: user.id,
        licenseNumber: drv.license,
        phone: drv.phone,
        availabilityStatus: true,
        organizationId: org1.id,
      },
    });
  }

  // Org 1 customers
  const customers1 = [
    { name: 'Fernando Souza', phone: '(11) 95555-0001', address: 'Rua das Flores, 123', lat: -23.5505, lng: -46.6333 },
    { name: 'Ana Oliveira', phone: '(11) 95555-0002', address: 'Av. Brasil, 456', lat: -23.5515, lng: -46.6343 },
    { name: 'Construtora Nova Era', phone: '(11) 95555-0003', address: 'Rua Augusta, 789', lat: -23.5525, lng: -46.6353 },
    { name: 'Mercado do Bairro', phone: '(11) 95555-0004', address: 'Praça da Sé, 100', lat: -23.5535, lng: -46.6363 },
    { name: 'Edifício Comercial SP', phone: '(11) 95555-0005', address: 'Av. Paulista, 2000', lat: -23.5545, lng: -46.6373 },
  ];

  for (const c of customers1) {
    await prisma.customer.create({
      data: {
        name: c.name,
        phone: c.phone,
        address: c.address,
        latitude: c.lat + (Math.random() - 0.5) * 0.02,
        longitude: c.lng + (Math.random() - 0.5) * 0.02,
        organizationId: org1.id,
      },
    });
  }

  // Org 1 vehicles
  const vehicleTypes = ['Caminhão Baú', 'Caminhão Aberto', 'Van', 'Pick-up', 'Caminhão Munck'];
  for (let i = 0; i < 5; i++) {
    await prisma.vehicle.create({
      data: {
        vehicleNumber: `CMD-${1001 + i}`,
        type: vehicleTypes[i],
        capacity: `${(i + 3) * 2}t`,
        fuelType: 'Diesel',
        organizationId: org1.id,
      },
    });
  }

  // 8. Create Users (Org 2 - Materiais ABC)
  console.log('👤 Creating users for Materiais ABC...');
  const adminUser2 = await prisma.user.create({
    data: {
      email: 'admin@materiaisabc.com.br',
      password_hash: hash2,
      name: 'Roberto Admin',
      phone: '(11) 98888-0001',
      role_id: adminRole2.id,
      organizationId: org2.id,
    },
  });

  await prisma.user.create({
    data: {
      email: 'despachante@materiaisabc.com.br',
      password_hash: hash2,
      name: 'Juliana Despachante',
      phone: '(11) 98888-0002',
      role_id: dispatcherRole2.id,
      organizationId: org2.id,
    },
  });

  // Org 2 drivers
  const drivers2 = [
    { name: 'Marcos Rápido', email: 'marcos@abc.com.br', phone: '(11) 96666-0001', license: 'SP111222333' },
    { name: 'Felipe Carga', email: 'felipe@abc.com.br', phone: '(11) 96666-0002', license: 'SP444555666' },
  ];

  for (const drv of drivers2) {
    const hashedPass = await argon2.hash('driver123');
    const user = await prisma.user.create({
      data: {
        email: drv.email,
        password_hash: hashedPass,
        name: drv.name,
        phone: drv.phone,
        role_id: driverRole2.id,
        organizationId: org2.id,
      },
    });
    await prisma.driver.create({
      data: {
        userId: user.id,
        licenseNumber: drv.license,
        phone: drv.phone,
        availabilityStatus: true,
        organizationId: org2.id,
      },
    });
  }

  // Org 2 customers
  const customers2 = [
    { name: 'Padaria Pão Quente', phone: '(11) 94444-0001', address: 'Rua Direita, 50' },
    { name: 'Restaurante Sabor Caseiro', phone: '(11) 94444-0002', address: 'Av. São João, 300' },
    { name: 'Loja de Materiais Ferreira', phone: '(11) 94444-0003', address: 'Rua 25 de Março, 500' },
  ];

  for (const c of customers2) {
    await prisma.customer.create({
      data: {
        name: c.name,
        phone: c.phone,
        address: c.address,
        latitude: -23.5475 + (Math.random() - 0.5) * 0.02,
        longitude: -46.6393 + (Math.random() - 0.5) * 0.02,
        organizationId: org2.id,
      },
    });
  }

  // Org 2 vehicles
  for (let i = 0; i < 3; i++) {
    await prisma.vehicle.create({
      data: {
        vehicleNumber: `ABC-${2001 + i}`,
        type: ['Van', 'Pick-up', 'Caminhão Baú'][i],
        capacity: `${[1, 2, 5][i]}t`,
        fuelType: 'Gasolina',
        organizationId: org2.id,
      },
    });
  }

  console.log('');
  console.log('✅ Seed completed successfully!');
  console.log('');
  console.log('📋 Organizations:');
  console.log(`  1. Construtora Modelo LTDA (org slug: construtora-modelo)`);
  console.log(`  2. Materiais de Construção ABC (org slug: materiais-abc)`);
  console.log('');
  console.log('👤 Test Credentials:');
  console.log('  Org 1 - Construtora Modelo:');
  console.log('    Admin:      admin@construtoramodelo.com.br / admin123');
  console.log('    Dispatcher:  despachante@construtoramodelo.com.br / admin123');
  console.log('    Driver:      joao@cm.com.br / driver123');
  console.log('  Org 2 - Materiais ABC:');
  console.log('    Admin:      admin@materiaisabc.com.br / admin123');
  console.log('    Dispatcher:  despachante@materiaisabc.com.br / admin123');
  console.log('    Driver:      marcos@abc.com.br / driver123');
  console.log('');
  console.log('📊 Plans: Starter (R$99), Growth (R$299), Professional (R$699), Enterprise');
  console.log('  Org 1: Growth plan (ACTIVE)');
  console.log('  Org 2: Starter plan (TRIAL)');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

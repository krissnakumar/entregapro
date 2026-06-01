import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

export interface AuthUser {
  email: string;
  password: string;
}

export const ORG1_ADMIN: AuthUser = {
  email: "admin@construtoramodelo.com.br",
  password: "admin123",
};

export const ORG1_DISPATCHER: AuthUser = {
  email: "despachante@construtoramodelo.com.br",
  password: "admin123",
};

export const ORG1_DRIVER: AuthUser = {
  email: "joao@cm.com.br",
  password: "driver123",
};

export const ORG2_ADMIN: AuthUser = {
  email: "admin@materiaisabc.com.br",
  password: "admin123",
};

export const ORG2_DISPATCHER: AuthUser = {
  email: "despachante@materiaisabc.com.br",
  password: "admin123",
};

export let app: INestApplication;
export let prisma: PrismaService;

import * as argon2 from "argon2";

export async function setupTestApp(): Promise<void> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = moduleFixture.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.init();
  prisma = app.get(PrismaService);

  // Ensure seed user passwords are not corrupted by prior test runs
  const seedPasswords: { email: string; password: string }[] = [
    { email: "admin@construtoramodelo.com.br", password: "admin123" },
    { email: "despachante@construtoramodelo.com.br", password: "admin123" },
    { email: "joao@cm.com.br", password: "driver123" },
    { email: "pedro@cm.com.br", password: "driver123" },
    { email: "admin@materiaisabc.com.br", password: "admin123" },
    { email: "despachante@materiaisabc.com.br", password: "admin123" },
    { email: "marcos@abc.com.br", password: "driver123" },
  ];
  for (const sp of seedPasswords) {
    const password_hash = await argon2.hash(sp.password);
    await prisma.user.updateMany({
      where: { email: sp.email },
      data: { password_hash },
    });
  }
}

export async function teardownTestApp(): Promise<void> {
  if (app) await app.close();
}

export async function login(user: AuthUser): Promise<{ access_token: string; refresh_token: string; user: any }> {
  const res = await request(app.getHttpServer())
    .post("/auth/login")
    .send({ email: user.email, password: user.password })
    .expect(200);
  return res.body;
}

export function authHeader(token: string): [string, string] {
  return ["Authorization", `Bearer ${token}`];
}

export async function createTestCustomer(orgId: string, token: string, overrides: Record<string, any> = {}) {
  const res = await request(app.getHttpServer())
    .post("/customers")
    .set(...authHeader(token))
    .send({
      name: `Test Customer ${Date.now()}`,
      phone: `(11) 9${Math.random().toString().slice(2, 8)}-${Math.random().toString().slice(2, 6)}`,
      address: "Rua Teste, 123",
      city: "São Paulo",
      state: "SP",
      zipCode: "01001-000",
      document: `${Math.random().toString().slice(2, 11)}/${Math.random().toString().slice(2, 6)}-${Math.random().toString().slice(2, 4)}`,
      latitude: -23.5505,
      longitude: -46.6333,
      ...overrides,
    })
    .expect(201);
  return res.body;
}

export async function createTestDriver(orgId: string, token: string, userId: string, vehicleId: string, overrides: Record<string, any> = {}) {
  const res = await request(app.getHttpServer())
    .post("/drivers")
    .set(...authHeader(token))
    .send({
      userId,
      vehicleId,
      licenseNumber: `TEST${Math.random().toString().slice(2, 8)}`,
      phone: `(11) 9${Math.random().toString().slice(2, 8)}-${Math.random().toString().slice(2, 6)}`,
      ...overrides,
    })
    .expect(201);
  return res.body;
}

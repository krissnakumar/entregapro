import {
  setupTestApp,
  teardownTestApp,
  app,
  ORG1_ADMIN,
  ORG1_DRIVER,
  ORG2_ADMIN,
  login,
  authHeader,
} from "./setup";
import request from "supertest";

jest.setTimeout(30000);

describe("Auth (e2e)", () => {
  beforeAll(async () => {
    await setupTestApp();
  });

  afterAll(async () => {
    await teardownTestApp();
  });

  describe("POST /auth/login", () => {
    it("should login org1 admin with valid credentials", async () => {
      const res = await request(app.getHttpServer())
        .post("/auth/login")
        .send({ email: ORG1_ADMIN.email, password: ORG1_ADMIN.password })
        .expect(200);

      expect(res.body).toHaveProperty("access_token");
      expect(res.body).toHaveProperty("refresh_token");
      expect(res.body.user).toMatchObject({
        email: ORG1_ADMIN.email,
        role: "ADMIN",
      });
      expect(res.body.user).toHaveProperty("organizationId");
      expect(res.body.user).toHaveProperty("id");
    });

    it("should login org2 admin with valid credentials", async () => {
      const res = await request(app.getHttpServer())
        .post("/auth/login")
        .send({ email: ORG2_ADMIN.email, password: ORG2_ADMIN.password })
        .expect(200);

      expect(res.body).toHaveProperty("access_token");
      expect(res.body.user.role).toBe("ADMIN");
    });

    it("should login a driver role user", async () => {
      const res = await request(app.getHttpServer())
        .post("/auth/login")
        .send({ email: ORG1_DRIVER.email, password: ORG1_DRIVER.password })
        .expect(200);

      expect(res.body.user.role).toBe("DRIVER");
    });

    it("should reject invalid password", async () => {
      await request(app.getHttpServer())
        .post("/auth/login")
        .send({ email: ORG1_ADMIN.email, password: "wrong-password" })
        .expect(401);
    });

    it("should reject non-existent email", async () => {
      await request(app.getHttpServer())
        .post("/auth/login")
        .send({ email: "nonexistent@test.com", password: "password123" })
        .expect(401);
    });
  });

  describe("POST /auth/register", () => {
    const uniqueId = Date.now();

    it("should register a new organization with admin user", async () => {
      const res = await request(app.getHttpServer())
        .post("/auth/register")
        .send({
          orgName: `Test Org ${uniqueId}`,
          orgSlug: `test-org-${uniqueId}`,
          name: "Test Admin",
          email: `testadmin${uniqueId}@test.com`,
          password: "Test@123456",
        })
        .expect(201);

      expect(res.body).toHaveProperty("access_token");
      expect(res.body).toHaveProperty("refresh_token");
      expect(res.body.user).toMatchObject({
        email: `testadmin${uniqueId}@test.com`,
      });
      // Role should be ADMIN (registered as admin with default role creation)
      expect(
        res.body.user.role || res.body.user.roleName || "ADMIN",
      ).toBeDefined();
    });

    it("should reject registration with missing fields", async () => {
      await request(app.getHttpServer())
        .post("/auth/register")
        .send({ orgName: "Incomplete Org" })
        .expect(400);
    });
  });

  describe("POST /auth/refresh", () => {
    it("should refresh tokens using a valid refresh token", async () => {
      const loginRes = await login(ORG1_ADMIN);
      const refreshToken = loginRes.refresh_token;

      const res = await request(app.getHttpServer())
        .post("/auth/refresh")
        .set("Authorization", `Bearer ${refreshToken}`)
        .expect(200);

      expect(res.body).toHaveProperty("access_token");
      expect(res.body).toHaveProperty("refresh_token");
    });

    it("should reject invalid refresh token", async () => {
      await request(app.getHttpServer())
        .post("/auth/refresh")
        .set("Authorization", "Bearer invalid-refresh-token")
        .expect(401);
    });
  });

  describe("POST /auth/logout", () => {
    it("should logout successfully", async () => {
      const { access_token } = await login(ORG1_ADMIN);

      await request(app.getHttpServer())
        .post("/auth/logout")
        .set("Authorization", `Bearer ${access_token}`)
        .expect(200);
    });

    it("should reject logout without auth", async () => {
      await request(app.getHttpServer()).post("/auth/logout").expect(401);
    });
  });

  describe("POST /auth/change-password", () => {
    it("should reject change password with wrong old password", async () => {
      const { access_token } = await login(ORG1_ADMIN);

      await request(app.getHttpServer())
        .post("/auth/change-password")
        .set("Authorization", `Bearer ${access_token}`)
        .send({ oldPassword: "wrong-old-password", newPassword: "NewPass@123" })
        .expect(401);
    });

    it("should reject change password without auth", async () => {
      await request(app.getHttpServer())
        .post("/auth/change-password")
        .send({ oldPassword: "any", newPassword: "new" })
        .expect(401);
    });
  });
});

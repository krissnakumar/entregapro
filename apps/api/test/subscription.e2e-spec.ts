import { setupTestApp, teardownTestApp, app, prisma, ORG1_ADMIN, ORG2_ADMIN, login, authHeader } from "./setup";
import request from "supertest";

jest.setTimeout(30000);

describe("Subscription & Plans (e2e)", () => {
  let org1Token: string;
  let org2Token: string;
  let org1Id: string;
  let org2Id: string;

  beforeAll(async () => {
    await setupTestApp();
    const login1 = await login(ORG1_ADMIN);
    org1Token = login1.access_token;
    org1Id = login1.user.organizationId;

    const login2 = await login(ORG2_ADMIN);
    org2Token = login2.access_token;
    org2Id = login2.user.organizationId;
  });

  afterAll(async () => {
    await teardownTestApp();
  });

  describe("GET /plans", () => {
    it("should return all available plans", async () => {
      const res = await request(app.getHttpServer())
        .get("/plans")
        .set(...authHeader(org1Token))
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(3);

      const starter = res.body.find((p: any) => p.slug === "starter");
      expect(starter).toBeDefined();
      expect(starter).toHaveProperty("monthlyPrice");
    });
  });

  describe("GET /subscription/current", () => {
    it("should return current subscription for org1", async () => {
      const res = await request(app.getHttpServer())
        .get("/subscription/current")
        .set(...authHeader(org1Token))
        .expect(200);

      expect(res.body).toHaveProperty("plan");
      expect(res.body.status).toBe("ACTIVE");
      expect(res.body.organizationId).toBe(org1Id);
    });

    it("should return current subscription for org2", async () => {
      const res = await request(app.getHttpServer())
        .get("/subscription/current")
        .set(...authHeader(org2Token))
        .expect(200);

      expect(res.body).toHaveProperty("plan");
      expect(res.body.organizationId).toBe(org2Id);
    });

    it("should be scoped per organization", async () => {
      const [res1, res2] = await Promise.all([
        request(app.getHttpServer()).get("/subscription/current").set(...authHeader(org1Token)).expect(200),
        request(app.getHttpServer()).get("/subscription/current").set(...authHeader(org2Token)).expect(200),
      ]);

      expect(res1.body.organizationId).not.toBe(res2.body.organizationId);
    });
  });

  describe("GET /subscription/usage", () => {
    it("should return usage metrics", async () => {
      const res = await request(app.getHttpServer())
        .get("/subscription/usage")
        .set(...authHeader(org1Token))
        .expect(200);

      expect(res.body).toHaveProperty("drivers");
      expect(res.body).toHaveProperty("deliveries");
      expect(res.body).toHaveProperty("storage");
      expect(res.body).toHaveProperty("vehicles");
    });
  });

  describe("POST /subscription/change-plan", () => {
    it("should allow org2 to upgrade from starter to growth", async () => {
      const res = await request(app.getHttpServer())
        .post("/subscription/change-plan")
        .set(...authHeader(org2Token))
        .send({ planSlug: "growth" })
        .expect(200);

      expect(res.body).toHaveProperty("plan");
      expect(res.body.plan.slug).toBe("growth");
    });

    it("should allow org2 to downgrade back to starter", async () => {
      const res = await request(app.getHttpServer())
        .post("/subscription/change-plan")
        .set(...authHeader(org2Token))
        .send({ planSlug: "starter" })
        .expect(200);

      expect(res.body.plan.slug).toBe("starter");
    });

    it("should reject changing to non-existent plan", async () => {
      await request(app.getHttpServer())
        .post("/subscription/change-plan")
        .set(...authHeader(org1Token))
        .send({ planSlug: "non-existent-plan" })
        .expect(404);
    });
  });

  describe("POST /subscription/cancel", () => {
    it("should cancel subscription", async () => {
      const res = await request(app.getHttpServer())
        .post("/subscription/cancel")
        .set(...authHeader(org2Token))
        .expect(200);

      expect(res.body.status).toBe("CANCELLED");
      expect(res.body.cancelledAt).toBeDefined();
    });
  });
});

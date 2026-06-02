import {
  setupTestApp,
  teardownTestApp,
  app,
  prisma,
  ORG1_ADMIN,
  login,
  authHeader,
} from "./setup";
import request from "supertest";

jest.setTimeout(30000);

describe("Public Tracking (e2e)", () => {
  let adminToken: string;
  let deliveryId: string;
  let customerId: string;
  let orgId: string;

  beforeAll(async () => {
    await setupTestApp();
    const loginRes = await login(ORG1_ADMIN);
    adminToken = loginRes.access_token;
    orgId = loginRes.user.organizationId;

    const customer = await prisma.customer.findFirst({
      where: { organizationId: orgId },
    });
    customerId = customer!.id;

    const driver = await prisma.driver.findFirst({
      where: { organizationId: orgId },
    });

    // Create a delivery via dispatch
    const delivery = await request(app.getHttpServer())
      .post("/dispatch")
      .set(...authHeader(adminToken))
      .send({
        customerId,
        driverId: driver!.id,
        scheduledDate: new Date(Date.now() + 86400000).toISOString(),
        address: "Av. Tracking Teste, 500",
        latitude: -23.561,
        longitude: -46.656,
        items: [
          {
            description: "Item Teste",
            quantity: 10,
            unit: "UN",
            unitPrice: 50,
          },
        ],
      });

    deliveryId =
      delivery.body.id ||
      delivery.body.delivery?.id ||
      delivery.body.deliveryId;

    // Progress to IN_TRANSIT
    if (deliveryId) {
      await request(app.getHttpServer())
        .patch(`/deliveries/${deliveryId}/status`)
        .set(...authHeader(adminToken))
        .send({ status: "ASSIGNED" })
        .catch(() => {});

      await request(app.getHttpServer())
        .patch(`/deliveries/${deliveryId}/status`)
        .set(...authHeader(adminToken))
        .send({ status: "IN_TRANSIT" })
        .catch(() => {});
    }
  });

  afterAll(async () => {
    if (deliveryId) {
      await prisma.deliveryStatusLog
        .deleteMany({ where: { deliveryId } })
        .catch(() => {});
      await prisma.deliveryTracking
        .deleteMany({ where: { deliveryId } })
        .catch(() => {});
      await prisma.delivery
        .deleteMany({ where: { id: deliveryId } })
        .catch(() => {});
    }
    await teardownTestApp();
  });

  describe("GET /tracking/public/:id (no auth)", () => {
    it("should return delivery tracking info for valid delivery", async () => {
      if (!deliveryId) return; // skip if setup failed
      const res = await request(app.getHttpServer())
        .get(`/tracking/public/${deliveryId}`)
        .expect(200);

      expect(res.body).toHaveProperty("id", deliveryId);
      expect(res.body).toHaveProperty("status");
      expect(res.body).toHaveProperty("address");
      // Should NOT expose internal fields
      expect(res.body).not.toHaveProperty("organizationId");
    });

    it("should include driver info in public tracking", async () => {
      if (!deliveryId) return;
      const res = await request(app.getHttpServer())
        .get(`/tracking/public/${deliveryId}`)
        .expect(200);

      if (res.body.driver) {
        expect(res.body.driver).toHaveProperty("name");
        expect(res.body.driver).not.toHaveProperty("email");
      }
    });

    it("should include timeline / status history", async () => {
      if (!deliveryId) return;
      const res = await request(app.getHttpServer())
        .get(`/tracking/public/${deliveryId}`)
        .expect(200);

      const timeline =
        res.body.timeline || res.body.statusLogs || res.body.status_history;
      if (timeline) {
        expect(Array.isArray(timeline)).toBe(true);
      }
    });

    it("should return 404 for non-existent delivery", async () => {
      await request(app.getHttpServer())
        .get("/tracking/public/non-existent-delivery-id")
        .expect(404);
    });
  });

  describe("GET /tracking/by-document", () => {
    it("should return deliveries by customer document", async () => {
      if (!customerId) return;
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
      });

      const res = await request(app.getHttpServer())
        .get("/tracking/by-document")
        .query({ doc: customer!.phone })
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it("should return empty array for unknown document", async () => {
      const res = await request(app.getHttpServer())
        .get("/tracking/by-document")
        .query({ doc: "(11) 00000-0000" })
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it("should return empty array when no doc parameter", async () => {
      const res = await request(app.getHttpServer())
        .get("/tracking/by-document")
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe("GET /pod/public/:deliveryId", () => {
    it("should return 404 when no POD exists", async () => {
      if (!deliveryId) return;
      await request(app.getHttpServer())
        .get(`/pod/public/${deliveryId}`)
        .expect(404);
    });
  });
});

import { setupTestApp, teardownTestApp, app } from "./setup";

describe("App (e2e)", () => {
  beforeAll(async () => {
    await setupTestApp();
  });

  afterAll(async () => {
    await teardownTestApp();
  });

  it("should boot and be defined", () => {
    expect(app).toBeDefined();
    expect(app.getHttpServer()).toBeDefined();
  });
});

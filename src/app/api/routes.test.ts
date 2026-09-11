import { beforeEach, describe, expect, it, vi } from "vitest";

const prisma = {
  device: { upsert: vi.fn() },
  telemetry: { create: vi.fn() },
  alert: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
};

const scheduleAssessment = vi.fn();

vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("@/lib/risk-assessment", () => ({
  runRiskAssessment: scheduleAssessment,
}));
vi.mock("@/lib/alert-telemetry", () => ({
  attachRecentTelemetry: vi.fn(async (alerts) => alerts),
}));
vi.mock("next/server", async () => {
  const actual = await vi.importActual<typeof import("next/server")>("next/server");
  return { ...actual, after: vi.fn() };
});

const { POST: createAlert } = await import("@/app/api/alerts/route");
const {
  GET: getAlert,
  PATCH: updateAlert,
} = await import("@/app/api/alerts/[id]/route");
const { POST: createTelemetry } = await import("@/app/api/telemetry/route");

function jsonRequest(body: unknown, method = "POST") {
  return new Request("http://localhost/api/test", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/telemetry", () => {
  beforeEach(() => vi.clearAllMocks());

  it("stores a valid heart-rate reading", async () => {
    const telemetry = {
      id: "telemetry-1",
      deviceId: "device-1",
      heartRate: 148,
      recordedAt: new Date().toISOString(),
    };
    prisma.telemetry.create.mockResolvedValue(telemetry);

    const response = await createTelemetry(
      jsonRequest({
        deviceId: "device-1",
        deviceType: "NECKLACE",
        heartRate: 148,
      })
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ telemetry });
    expect(prisma.device.upsert).toHaveBeenCalledOnce();
    expect(prisma.telemetry.create).toHaveBeenCalledWith({
      data: { deviceId: "device-1", heartRate: 148 },
    });
  });

  it.each([29, 221, 148.5, "148"]) (
    "rejects an invalid heart rate: %s",
    async (heartRate) => {
      const response = await createTelemetry(
        jsonRequest({
          deviceId: "device-1",
          deviceType: "NECKLACE",
          heartRate,
        })
      );

      expect(response.status).toBe(400);
      expect(prisma.telemetry.create).not.toHaveBeenCalled();
    }
  );
});

describe("POST /api/alerts", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates an active alert before scheduling assessment", async () => {
    const alert = {
      id: "alert-1",
      deviceId: "device-1",
      triggerType: "MANUAL_SOS",
      status: "ACTIVE",
      aiStatus: "PENDING",
    };
    prisma.alert.create.mockResolvedValue(alert);

    const response = await createAlert(
      jsonRequest({
        deviceId: "device-1",
        deviceType: "BAG_CLIP",
        triggerType: "MANUAL_SOS",
        latitude: 12.97,
        longitude: 77.59,
      })
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ alert });
    expect(prisma.alert.create).toHaveBeenCalledWith({
      data: {
        deviceId: "device-1",
        triggerType: "MANUAL_SOS",
        status: "ACTIVE",
        aiStatus: "PENDING",
        latitude: 12.97,
        longitude: 77.59,
        locationLabel: null,
      },
    });
    expect(scheduleAssessment).not.toHaveBeenCalled();
  });

  it("rejects invalid trigger and location values without touching the database", async () => {
    const response = await createAlert(
      jsonRequest({
        deviceId: "device-1",
        deviceType: "BAG_CLIP",
        triggerType: "BUTTON",
        latitude: 95,
      })
    );

    expect(response.status).toBe(400);
    expect(prisma.device.upsert).not.toHaveBeenCalled();
    expect(prisma.alert.create).not.toHaveBeenCalled();
  });
});

describe("/api/alerts/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 404 for an unknown alert", async () => {
    prisma.alert.findUnique.mockResolvedValue(null);

    const response = await getAlert(new Request("http://localhost"), {
      params: Promise.resolve({ id: "missing" }),
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Alert not found." });
  });

  it("updates an alert to resolved", async () => {
    prisma.alert.findUnique.mockResolvedValue({ id: "alert-1" });
    const updatedAlert = { id: "alert-1", status: "RESOLVED" };
    prisma.alert.update.mockResolvedValue(updatedAlert);

    const response = await updateAlert(
      jsonRequest({ status: "RESOLVED" }, "PATCH"),
      { params: Promise.resolve({ id: "alert-1" }) }
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ alert: updatedAlert });
    expect(prisma.alert.update).toHaveBeenCalledWith({
      where: { id: "alert-1" },
      data: { status: "RESOLVED", resolvedAt: expect.any(Date) },
    });
  });

  it("rejects invalid status values", async () => {
    const response = await updateAlert(
      jsonRequest({ status: "ACTIVE" }, "PATCH"),
      { params: Promise.resolve({ id: "alert-1" }) }
    );

    expect(response.status).toBe(400);
    expect(prisma.alert.findUnique).not.toHaveBeenCalled();
    expect(prisma.alert.update).not.toHaveBeenCalled();
  });
});
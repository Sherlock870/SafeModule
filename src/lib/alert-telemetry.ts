import type { Alert, Device } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function attachRecentTelemetry<T extends Alert & { device: Device }>(
  alerts: T[]
) {
  const deviceIds = [...new Set(alerts.map((a) => a.deviceId))];

  const telemetry = deviceIds.length
    ? await prisma.telemetry.findMany({
        where: { deviceId: { in: deviceIds } },
        orderBy: { recordedAt: "desc" },
      })
    : [];

  const byDevice = new Map<string, typeof telemetry>();
  for (const reading of telemetry) {
    const existing = byDevice.get(reading.deviceId) ?? [];
    if (existing.length < 10) existing.push(reading);
    byDevice.set(reading.deviceId, existing);
  }

  return alerts.map((alert) => ({
    ...alert,
    recentTelemetry: byDevice.get(alert.deviceId) ?? [],
  }));
}

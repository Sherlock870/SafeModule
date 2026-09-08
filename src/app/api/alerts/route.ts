import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { runRiskAssessment } from "@/lib/risk-assessment";
import { attachRecentTelemetry } from "@/lib/alert-telemetry";

const ALERT_STATUSES = ["ACTIVE", "RESOLVED", "CANCELLED"] as const;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  const deviceId = typeof body?.deviceId === "string" ? body.deviceId : "";
  const deviceType = body?.deviceType;
  const triggerType = body?.triggerType;
  const latitude = typeof body?.latitude === "number" ? body.latitude : null;
  const longitude = typeof body?.longitude === "number" ? body.longitude : null;
  const locationLabel =
    typeof body?.locationLabel === "string" ? body.locationLabel : null;

  if (!deviceId || (deviceType !== "BAG_CLIP" && deviceType !== "NECKLACE")) {
    return NextResponse.json(
      { error: "deviceId and a valid deviceType are required." },
      { status: 400 }
    );
  }

  if (triggerType !== "MANUAL_SOS" && triggerType !== "VOICE_DISTRESS") {
    return NextResponse.json(
      { error: "triggerType must be MANUAL_SOS or VOICE_DISTRESS." },
      { status: 400 }
    );
  }

  if (latitude !== null && (latitude < -90 || latitude > 90)) {
    return NextResponse.json(
      { error: "latitude must be between -90 and 90." },
      { status: 400 }
    );
  }

  if (longitude !== null && (longitude < -180 || longitude > 180)) {
    return NextResponse.json(
      { error: "longitude must be between -180 and 180." },
      { status: 400 }
    );
  }

  await prisma.device.upsert({
    where: { id: deviceId },
    update: {},
    create: { id: deviceId, type: deviceType, label: `Simulated ${deviceType}` },
  });

  const alert = await prisma.alert.create({
    data: {
      deviceId,
      triggerType,
      status: "ACTIVE",
      aiStatus: "PENDING",
      latitude,
      longitude,
      locationLabel,
    },
  });

  after(() => runRiskAssessment(alert.id));

  return NextResponse.json({ alert }, { status: 201 });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  if (status && !ALERT_STATUSES.includes(status as (typeof ALERT_STATUSES)[number])) {
    return NextResponse.json({ error: "Invalid status filter." }, { status: 400 });
  }

  const alerts = await prisma.alert.findMany({
    where: status ? { status: status as (typeof ALERT_STATUSES)[number] } : undefined,
    orderBy: { createdAt: "desc" },
    include: { device: true },
  });

  const withTelemetry = await attachRecentTelemetry(alerts);

  return NextResponse.json({ alerts: withTelemetry });
}

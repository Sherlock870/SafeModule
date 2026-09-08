import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  const deviceId = typeof body?.deviceId === "string" ? body.deviceId : "";
  const deviceType = body?.deviceType;
  const heartRate = body?.heartRate;

  if (!deviceId || (deviceType !== "BAG_CLIP" && deviceType !== "NECKLACE")) {
    return NextResponse.json(
      { error: "deviceId and a valid deviceType are required." },
      { status: 400 }
    );
  }

  if (typeof heartRate !== "number" || heartRate < 30 || heartRate > 220) {
    return NextResponse.json(
      { error: "heartRate must be a number between 30 and 220." },
      { status: 400 }
    );
  }

  await prisma.device.upsert({
    where: { id: deviceId },
    update: {},
    create: { id: deviceId, type: deviceType, label: `Simulated ${deviceType}` },
  });

  const telemetry = await prisma.telemetry.create({
    data: { deviceId, heartRate },
  });

  return NextResponse.json({ telemetry }, { status: 201 });
}

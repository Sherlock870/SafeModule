import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { attachRecentTelemetry } from "@/lib/alert-telemetry";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const alert = await prisma.alert.findUnique({
    where: { id },
    include: { device: true },
  });

  if (!alert) {
    return NextResponse.json({ error: "Alert not found." }, { status: 404 });
  }

  const [withTelemetry] = await attachRecentTelemetry([alert]);

  return NextResponse.json({ alert: withTelemetry });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const status = body?.status;

  if (status !== "RESOLVED" && status !== "CANCELLED") {
    return NextResponse.json(
      { error: "status must be RESOLVED or CANCELLED." },
      { status: 400 }
    );
  }

  const existing = await prisma.alert.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Alert not found." }, { status: 404 });
  }

  const alert = await prisma.alert.update({
    where: { id },
    data: { status, resolvedAt: new Date() },
  });

  return NextResponse.json({ alert });
}
